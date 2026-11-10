'use client';

import {useEffect, useRef, useState} from 'react';
import type {Map as MapLibreMap} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

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
  const [imageryError, setImageryError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
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
  }, [latitude, longitude]);

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
    <div ref={container} className="flyover-map" aria-label="Interactive satellite map" hidden={phase === 'unavailable'}/>
    <p role="status" className="subtle">
      {phase === 'loading' && 'Loading satellite map…'}
      {phase === 'flying' && 'Flying in…'}
      {phase === 'circling' && 'Circling the property. Interact with the map to take control.'}
      {phase === 'manual' && 'Drag, scroll or pinch to explore.'}
      {phase === 'unavailable' && 'The satellite map could not open in this browser.'}
    </p>
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
