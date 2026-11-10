'use client';

import {useEffect, useRef, useState} from 'react';
import type {Map as MapLibreMap} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {googleMapsBrowserKey, loadGoogleMapsLibrary} from '@/lib/google-maps-client';

type Phase = 'loading' | 'flying' | 'circling' | 'manual' | 'unavailable';

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
    let animation: 'flight' | 'orbit' | undefined;

    const fallback = () => {
      if (signal.aborted) return;
      setPhase('loading');
      setUseSatellite(true);
    };
    const loadingTimer = setTimeout(fallback, 18000);

    void loadGoogleMapsLibrary('maps3d').then(({Map3DElement, Marker3DElement}) => {
      if (signal.aborted) return;
      const overview = {center: {lat: 48.44, lng: -123.35}, range: 11500, tilt: 20, heading: 0};
      const center = {lat: latitude, lng: longitude};
      const destination = {center, range: 220, tilt: 63, heading: 340, altitudeMode: 'CLAMP_TO_GROUND'} as const;
      const globe = new Map3DElement({
        ...overview,
        mode: 'SATELLITE',
        description: 'Photorealistic 3D property flyover',
      });
      map = globe;
      globe.style.cssText = 'display:block;width:100%;height:100%';
      globe.append(new Marker3DElement({position: center, altitudeMode: 'CLAMP_TO_GROUND'}));

      takeControl.current = () => {
        if (!animation) return;
        animation = undefined;
        globe.stopCameraAnimation();
        setPhase('manual');
      };
      for (const type of ['pointerdown', 'wheel', 'keydown']) {
        globe.addEventListener(type, () => takeControl.current(), {signal, capture: true, passive: true});
      }

      replay.current = () => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          globe.flyCameraTo({endCamera: destination, durationMillis: 0});
          setPhase('manual');
          return;
        }
        Object.assign(globe, overview);
        animation = 'flight';
        setPhase('flying');
        globe.flyCameraTo({endCamera: destination, durationMillis: 9000});
      };
      globe.addEventListener('gmp-animationend', () => {
        if (animation === 'flight') {
          animation = 'orbit';
          setPhase('circling');
          globe.flyCameraAround({camera: destination, durationMillis: 40000, repeatCount: 1});
        } else if (animation === 'orbit') {
          animation = undefined;
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
      map?.remove();
    };
  }, [latitude, longitude, useSatellite]);

  useEffect(() => {
    if (!useSatellite) return;
    let disposed = false;
    let map: MapLibreMap | undefined;
    let frame = 0;
    let flying = false;
    const stop = () => {
      flying = false;
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

      takeControl.current = () => {
        if (!flying && !frame) return;
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
        flying = true;
        setPhase('flying');
        satellite.once('moveend', () => {
          if (!flying) return;
          flying = false;
          setPhase('circling');
          const start = performance.now();
          const bearing = satellite.getBearing();
          const orbit = (now: number) => {
            satellite.setBearing(bearing + (now - start) * 0.0072);
            frame = requestAnimationFrame(orbit);
          };
          frame = requestAnimationFrame(orbit);
        });
        satellite.flyTo({...destination, duration: 9000});
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

  return <section className="dialog-body">
    <div ref={container} className="flyover-map" aria-label={useSatellite ? 'Interactive satellite map' : 'Interactive Google 3D map'} hidden={phase === 'unavailable'}/>
    <p role="status" className="subtle">
      {phase === 'loading' && (useSatellite ? 'Loading satellite map…' : 'Loading Google 3D map…')}
      {phase === 'flying' && 'Flying in…'}
      {phase === 'circling' && 'Circling the property. Interact with the map to take control.'}
      {phase === 'manual' && 'Drag, scroll or pinch to explore.'}
      {phase === 'unavailable' && 'The satellite map could not open in this browser.'}
    </p>
    {googleMapsBrowserKey && useSatellite && phase !== 'unavailable' &&
      <p className="subtle">Google 3D could not load. Showing the satellite flyover.</p>}
    {imageryError && <p className="map-warning">Some satellite imagery could not load.</p>}
    <label className="share-label">Flyover link<input ref={linkInput} readOnly value={shareUrl} onFocus={event => event.currentTarget.select()}/></label>
    <div className="form-actions">
      <button className="secondary" onClick={onBack}>Back to listing</button>
      {(phase === 'flying' || phase === 'circling') && <button className="secondary" onClick={() => takeControl.current()}>Take control</button>}
      {phase === 'manual' && <button className="secondary" onClick={() => replay.current()}>Replay flight</button>}
      <button className="primary" onClick={() => void copyLink()}>{copied ? 'Link copied' : 'Copy Flyover link'}</button>
    </div>
  </section>;
}
