'use client';

import {useEffect, useRef, useState} from 'react';
import type {Map as MapLibreMap} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {googleMapsBrowserKey, loadGoogleMapsLibrary} from '@/lib/google-maps-client';

type Phase = 'loading' | 'flying' | 'circling' | 'paused' | 'manual' | 'unavailable';
type AnimationPhase = 'flying' | 'circling';
const flightDuration = 9000;
const orbitDuration = 40000;

export default function PropertyFlyover({latitude, longitude, shareUrl, onBack}: {
  latitude: number;
  longitude: number;
  shareUrl: string;
  onBack: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const replay = useRef<() => void>(() => {});
  const takeControl = useRef<() => void>(() => {});
  const pause = useRef<() => void>(() => {});
  const play = useRef<() => void>(() => {});
  const [phase, setPhase] = useState<Phase>('loading');
  const [useSatellite, setUseSatellite] = useState(!googleMapsBrowserKey);
  const [imageryError, setImageryError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (useSatellite || !element) return;
    const controller = new AbortController();
    const {signal} = controller;
    let map: google.maps.maps3d.Map3DElement | undefined;
    let active: {phase: AnimationPhase; duration: number; started: number} | undefined;
    let paused: {phase: AnimationPhase; duration: number} | undefined;
    let stopPending = Promise.resolve();
    let orbitEnd: ReturnType<typeof setTimeout> | undefined;

    const fallback = () => {
      if (signal.aborted) return;
      setPhase('loading');
      setUseSatellite(true);
    };
    const loadingTimer = setTimeout(fallback, 18000);
    const runCameraCommand = (command: () => void) =>
      // Maps can reject camera commands asynchronously after the scene loads.
      Promise.resolve().then(() => {
        if (!signal.aborted) return command();
      }).catch(fallback);

    void loadGoogleMapsLibrary('maps3d').then(({Map3DElement, Marker3DElement}) => {
      if (signal.aborted) return;
      const overview = {center: {lat: 48.44, lng: -123.35}, range: 11500, tilt: 20, heading: 0};
      const center = {lat: latitude, lng: longitude};
      const destination = {
        center: {...center, altitude: 5},
        range: 90,
        tilt: 63,
        heading: 340,
        altitudeMode: 'RELATIVE_TO_GROUND',
      } as const;
      const globe = new Map3DElement({
        ...overview,
        mode: 'SATELLITE',
        description: 'Photorealistic 3D property flyover',
      });
      map = globe;
      globe.style.cssText = 'display:block;width:100%;height:100%';
      globe.append(new Marker3DElement({position: center, altitudeMode: 'CLAMP_TO_GROUND'}));

      const stop = () => {
        active = undefined;
        clearTimeout(orbitEnd);
        stopPending = runCameraCommand(() => globe.stopCameraAnimation());
      };
      const animate = (phase: AnimationPhase, duration: number) => {
        const segment = {phase, duration, started: performance.now()};
        active = segment;
        setPhase(phase);
        void runCameraCommand(() => {
          if (active !== segment) return;
          if (phase === 'flying') {
            return globe.flyCameraTo({endCamera: destination, durationMillis: duration});
          }
          const camera = {...destination, heading: globe.heading ?? destination.heading};
          return globe.flyCameraAround({camera, durationMillis: orbitDuration, repeatCount: 1});
        }).then(() => {
          if (active !== segment || signal.aborted) return;
          segment.started = performance.now();
          if (phase === 'circling' && duration < orbitDuration) {
            // Google orbits in full turns. Stop the resumed turn after its remaining time.
            orbitEnd = setTimeout(() => {
              stop();
              setPhase('manual');
            }, duration);
          }
        });
      };
      pause.current = () => {
        if (!active) return;
        paused = {phase: active.phase, duration: Math.max(1, active.duration - (performance.now() - active.started))};
        stop();
        setPhase('paused');
      };
      play.current = () => {
        const segment = paused;
        if (!segment) return;
        void stopPending.then(() => {
          if (paused !== segment || signal.aborted) return;
          paused = undefined;
          animate(segment.phase, segment.duration);
        });
      };
      takeControl.current = () => {
        if (!active && !paused) return;
        paused = undefined;
        if (active) stop();
        setPhase('manual');
      };
      for (const type of ['pointerdown', 'wheel', 'keydown']) {
        globe.addEventListener(type, () => takeControl.current(), {signal, capture: true, passive: true});
      }
      replay.current = () => {
        void stopPending.then(() => {
          if (signal.aborted || active) return;
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            void runCameraCommand(() => globe.flyCameraTo({endCamera: destination, durationMillis: 0}));
            setPhase('manual');
            return;
          }
          Object.assign(globe, overview);
          animate('flying', flightDuration);
        });
      };
      globe.addEventListener('gmp-animationend', () => {
        if (active?.phase === 'flying') {
          animate('circling', orbitDuration);
        } else if (active?.phase === 'circling') {
          active = undefined;
          clearTimeout(orbitEnd);
          setPhase('manual');
        }
      }, {signal});

      globe.addEventListener('gmp-error', fallback, {signal});
      const start = (event: google.maps.maps3d.SteadyChangeEvent) => {
        if (!event.isSteady) return;
        globe.removeEventListener('gmp-steadychange', start);
        clearTimeout(loadingTimer);
        replay.current();
      };
      globe.addEventListener('gmp-steadychange', start, {signal});
      element.append(globe);
    }).catch(fallback);

    return () => {
      controller.abort();
      clearTimeout(loadingTimer);
      clearTimeout(orbitEnd);
      map?.remove();
    };
  }, [latitude, longitude, useSatellite]);

  useEffect(() => {
    if (!useSatellite) return;
    let disposed = false;
    let map: MapLibreMap | undefined;
    let frame = 0;
    let flightEndsAt: number | undefined;
    let pausedFlight: number | undefined;
    let pausedOrbit = false;
    const stop = () => {
      flightEndsAt = undefined;
      cancelAnimationFrame(frame);
      frame = 0;
      map?.stop();
    };

    void import('maplibre-gl').then(({Map, Marker, NavigationControl, setWorkerUrl}) => {
      if (disposed || !container.current) return;
      const destination = {center: [longitude, latitude] as [number, number], zoom: 17.5, pitch: 65, bearing: -20};
      const overview = {center: [-123.35, 48.44] as [number, number], zoom: 11, pitch: 0, bearing: 0};
      setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString());
      const satellite = new Map({
        container: container.current,
        ...overview,
        style: {
          version: 8,
          sources: {
            imagery: {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256,
              maxzoom: 19,
              attribution: 'Tiles © Esri · Esri, Maxar, Earthstar Geographics, and the GIS User Community',
            },
          },
          layers: [{id: 'imagery', type: 'raster', source: 'imagery'}],
        },
      });
      map = satellite;
      new Marker().setLngLat(destination.center).addTo(satellite);
      satellite.addControl(new NavigationControl(), 'top-right');
      satellite.on('error', () => { if (!disposed) setImageryError(true); });

      const orbit = () => {
        setPhase('circling');
        const start = performance.now();
        const bearing = satellite.getBearing();
        const rotate = (now: number) => {
          satellite.setBearing(bearing + (now - start) * 0.0072);
          frame = requestAnimationFrame(rotate);
        };
        frame = requestAnimationFrame(rotate);
      };
      const fly = (duration: number) => {
        flightEndsAt = performance.now() + duration;
        setPhase('flying');
        satellite.once('moveend', () => {
          if (flightEndsAt === undefined) return;
          flightEndsAt = undefined;
          orbit();
        });
        satellite.flyTo({...destination, duration});
      };
      pause.current = () => {
        if (flightEndsAt === undefined && !frame) return;
        pausedFlight = flightEndsAt === undefined ? undefined : Math.max(1, flightEndsAt - performance.now());
        pausedOrbit = Boolean(frame);
        stop();
        setPhase('paused');
      };
      play.current = () => {
        const duration = pausedFlight;
        const circling = pausedOrbit;
        pausedFlight = undefined;
        pausedOrbit = false;
        if (duration !== undefined) fly(duration);
        else if (circling) orbit();
      };
      takeControl.current = () => {
        if (flightEndsAt === undefined && !frame && pausedFlight === undefined && !pausedOrbit) return;
        pausedFlight = undefined;
        pausedOrbit = false;
        stop();
        setPhase('manual');
      };
      for (const type of ['pointerdown', 'wheel', 'keydown']) {
        satellite.getCanvasContainer().addEventListener(type, () => takeControl.current(), {passive: true});
      }
      satellite.getContainer().querySelector('.maplibregl-ctrl-top-right')?.addEventListener('click', () => takeControl.current(), true);

      replay.current = () => {
        stop();
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          satellite.jumpTo(destination);
          setPhase('manual');
          return;
        }
        satellite.jumpTo(overview);
        fly(flightDuration);
      };
      // Start as soon as the camera is available, even if a tile is slow or fails.
      replay.current();
    }).catch(() => { if (!disposed) setPhase('unavailable'); });

    return () => {
      disposed = true;
      stop();
      map?.remove();
    };
  }, [latitude, longitude, useSatellite]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      // The selectable field is also available when clipboard access is blocked.
      setCopied(false);
      linkInput.current?.focus();
      linkInput.current?.select();
    }
  }

  const playing = phase === 'flying' || phase === 'circling';

  return <section className="dialog-body">
    <div ref={container} className="flyover-map" aria-label={useSatellite ? 'Interactive satellite map' : 'Interactive Google 3D map'} hidden={phase === 'unavailable'}/>
    <p role="status" className="subtle">
      {phase === 'loading' && (useSatellite ? 'Loading satellite map…' : 'Loading Google 3D map…')}
      {phase === 'flying' && 'Flying in…'}
      {phase === 'circling' && 'Circling the property. Interact with the map to take control.'}
      {phase === 'paused' && 'Flyover paused.'}
      {phase === 'manual' && 'Drag, scroll or pinch to explore.'}
      {phase === 'unavailable' && 'The satellite map could not open in this browser.'}
    </p>
    {googleMapsBrowserKey && useSatellite && phase !== 'unavailable' &&
      <p className="subtle">Google 3D could not load. Showing the satellite flyover.</p>}
    {imageryError && <p className="map-warning">Some satellite imagery could not load.</p>}
    <label className="share-label">Flyover link<input ref={linkInput} readOnly value={shareUrl} onFocus={event => event.currentTarget.select()}/></label>
    <div className="form-actions">
      <button className="secondary" onClick={onBack}>Back to listing</button>
      {(playing || phase === 'paused') && <>
        <button className="secondary" onClick={() => playing ? pause.current() : play.current()}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button className="secondary" onClick={() => takeControl.current()}>Take control</button>
      </>}
      {phase === 'manual' && <button className="secondary" onClick={() => replay.current()}>Replay flight</button>}
      <button className="primary" onClick={() => void copyLink()}>{copied ? 'Link copied' : 'Copy Flyover link'}</button>
    </div>
  </section>;
}
