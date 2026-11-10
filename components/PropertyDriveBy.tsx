'use client';

import {useEffect, useRef, useState} from 'react';
import {findStreetViewApproach, headingTo, type StreetViewStop} from '@/lib/street-view-route';
import {distanceMeters} from '@/lib/geography';

import {googleMapsBrowserKey, loadGoogleMapsLibrary} from '@/lib/google-maps-client';

type Playback = 'loading' | 'ready' | 'playing' | 'manual' | 'finished' | 'no-route' | 'unavailable';

function readStop(data: google.maps.StreetViewPanoramaData): StreetViewStop | undefined {
  const location = data.location;
  if (!location?.pano || !location.latLng) return;
  return {
    id: location.pano,
    position: {latitude: location.latLng.lat(), longitude: location.latLng.lng()},
    links: (data.links ?? []).flatMap(link => link.pano && typeof link.heading === 'number'
      ? [{id: link.pano, heading: link.heading}] : []),
  };
}

async function getStop(service: google.maps.StreetViewService, request: google.maps.StreetViewPanoRequest | google.maps.StreetViewLocationRequest) {
  try {
    return readStop((await service.getPanorama(request)).data);
  } catch (error) {
    if (String(error).includes('ZERO_RESULTS')) return;
    throw error;
  }
}

export default function PropertyDriveBy({latitude, longitude, appleUrl, onBack}: {
  latitude: number;
  longitude: number;
  appleUrl: string;
  onBack: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const actions = useRef<{play: () => void; stop: () => void} | null>(null);
  const [phase, setPhase] = useState<Playback>('loading');
  const [length, setLength] = useState(0);

  useEffect(() => {
    if (!googleMapsBrowserKey || !container.current) return;
    const element = container.current;
    const controller = new AbortController();
    let panorama: google.maps.StreetViewPanorama | undefined;
    let removePendingListener: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let playing = false;

    const clearStep = () => {
      clearTimeout(timer);
      removePendingListener?.();
      removePendingListener = undefined;
    };
    const stop = () => {
      if (!playing) return;
      playing = false;
      clearStep();
      setPhase('manual');
    };
    for (const event of ['pointerdown', 'wheel', 'keydown']) {
      element.addEventListener(event, stop, {capture: true, passive: true});
    }

    const loadingTimeout = setTimeout(() => {
      controller.abort();
      setPhase('unavailable');
    }, 25000);

    void loadGoogleMapsLibrary('streetView').then(async ({StreetViewService, StreetViewPanorama, StreetViewPreference, StreetViewSource}) => {
      controller.signal.throwIfAborted();
      const service = new StreetViewService();
      const house = {latitude, longitude};
      const destination = await getStop(service, {
        location: {lat: latitude, lng: longitude},
        radius: 40,
        preference: StreetViewPreference.NEAREST,
        sources: [StreetViewSource.OUTDOOR, StreetViewSource.GOOGLE],
      });
      controller.signal.throwIfAborted();
      const route = destination && distanceMeters(house, destination.position) <= 40
        && await findStreetViewApproach(destination, id => getStop(service, {pano: id}), controller.signal);
      controller.signal.throwIfAborted();
      if (!route) {
        setPhase('no-route');
        return;
      }

      const viewer = new StreetViewPanorama(element, {
        visible: true,
        enableCloseButton: false,
        motionTracking: false,
        motionTrackingControl: false,
      });
      panorama = viewer;
      setLength(Math.round(route.meters / 5) * 5);

      const show = (index: number) => {
        clearStep();
        const current = route.stops[index];
        const next = route.stops[index + 1];
        const target = next?.position ?? house;
        const look = () => {
          if (distanceMeters(current.position, target) >= 0.5) {
            viewer.setPov({heading: headingTo(current.position, target), pitch: 0});
          }
        };
        const ready = () => {
          if (viewer.getPano() !== current.id || viewer.getStatus() !== 'OK') return;
          clearStep();
          look();
          if (!playing) return;
          if (next) {
            timer = setTimeout(() => show(index + 1), 850);
          } else {
            playing = false;
            setPhase('finished');
          }
        };

        if (viewer.getPano() === current.id && viewer.getStatus() === 'OK') {
          ready();
          return;
        }
        const listener = viewer.addListener('status_changed', ready);
        removePendingListener = () => listener.remove();
        timer = setTimeout(() => {
          clearStep();
          playing = false;
          setPhase('unavailable');
        }, 8000);
        if (index === 0) look();
        viewer.setPano(current.id);
      };

      const play = () => {
        playing = true;
        setPhase('playing');
        show(0);
      };
      actions.current = {play, stop};
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setPhase('ready');
        show(0);
      } else {
        play();
      }
    }).catch(() => {
      if (!controller.signal.aborted) setPhase('unavailable');
    }).finally(() => clearTimeout(loadingTimeout));

    return () => {
      controller.abort();
      clearTimeout(loadingTimeout);
      clearStep();
      actions.current = null;
      for (const event of ['pointerdown', 'wheel', 'keydown']) {
        element.removeEventListener(event, stop, true);
      }
      panorama?.setVisible(false);
    };
  }, [latitude, longitude]);

  const status = {
    loading: 'Finding a connected Street View approach…',
    ready: `About ${length} m away. Select Play drive-by to start.`,
    playing: `Driving toward the house from about ${length} m away.`,
    manual: 'Playback stopped. You can explore Street View manually.',
    finished: 'Arrived at the nearest Street View point to the house.',
    'no-route': 'There isn’t enough connected Street View imagery for this drive-by.',
    unavailable: 'Google Street View could not load. You can try Apple Look Around.',
  }[phase];

  return <section className="dialog-body">
    <div ref={container} className="driveby-panorama" aria-label="Google Street View panorama"
      hidden={phase === 'no-route' || phase === 'unavailable'}/>
    <p className="subtle" role="status">{status}</p>
    <div className="form-actions">
      <button className="secondary" onClick={onBack}>Back to listing</button>
      <a className="secondary" href={appleUrl} target="_blank" rel="noreferrer">Apple Look Around ↗</a>
      {phase === 'playing' && <button className="primary" onClick={() => actions.current?.stop()}>Take control</button>}
      {(phase === 'ready' || phase === 'finished' || phase === 'manual') &&
        <button className="primary" onClick={() => actions.current?.play()}>{phase === 'ready' ? 'Play drive-by' : 'Replay drive-by'}</button>}
    </div>
  </section>;
}
