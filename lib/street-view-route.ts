import {distanceMeters} from './geography';

type Position = {latitude: number; longitude: number};
type StreetViewLink = {id: string; heading: number};
export type StreetViewStop = {id: string; position: Position; links: StreetViewLink[]};

const targetMeters = 100;
const minimumMeters = 75;
const maximumMeters = 125;
const maximumSteps = 16;

export function headingTo(from: Position, to: Position) {
  const radians = Math.PI / 180;
  const latitude = from.latitude * radians;
  const targetLatitude = to.latitude * radians;
  const longitudeDelta = (to.longitude - from.longitude) * radians;
  const y = Math.sin(longitudeDelta) * Math.cos(targetLatitude);
  const x = Math.cos(latitude) * Math.sin(targetLatitude)
    - Math.sin(latitude) * Math.cos(targetLatitude) * Math.cos(longitudeDelta);
  return (Math.atan2(y, x) / radians + 360) % 360;
}

function turn(a: number, b: number) {
  return Math.abs(((a - b + 540) % 360) - 180);
}

export async function findStreetViewApproach(
  destination: StreetViewStop,
  lookup: (id: string) => Promise<StreetViewStop | undefined>,
  signal: AbortSignal,
) {
  let best: {stops: StreetViewStop[]; meters: number} | undefined;

  // Walk away from the nearest outdoor panorama, then reverse the connected sequence.
  for (const firstLink of destination.links.slice(0, 3)) {
    const stops = [destination];
    let link: StreetViewLink | undefined = firstLink;
    let meters = 0;
    for (let step = 0; link && step < maximumSteps; step++) {
      signal.throwIfAborted();
      const next = await lookup(link.id);
      signal.throwIfAborted();
      if (!next || stops.some(stop => stop.id === next.id)) break;
      const previous = stops[stops.length - 1];
      const segment = distanceMeters(previous.position, next.position);
      if (segment < 0.5 || segment > 40 || meters + segment > maximumMeters) break;
      meters += segment;
      stops.push(next);
      if (meters >= minimumMeters && (!best || Math.abs(meters - targetMeters) < Math.abs(best.meters - targetMeters))) {
        best = {stops: [...stops].reverse(), meters};
      }
      if (meters >= targetMeters) break;
      const heading = headingTo(previous.position, next.position);
      link = next.links
        .filter(candidate => turn(candidate.heading, heading) <= 55 && !stops.some(stop => stop.id === candidate.id))
        .sort((a, b) => turn(a.heading, heading) - turn(b.heading, heading))[0];
    }
    if (best && Math.abs(best.meters - targetMeters) <= 5) break;
  }
  return best;
}
