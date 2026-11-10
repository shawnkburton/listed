import assert from 'node:assert/strict';
import test from 'node:test';
import {findStreetViewApproach, headingTo, type StreetViewStop} from '../lib/street-view-route';

function stop(id: string, north: number, links: StreetViewStop['links'] = []): StreetViewStop {
  return {id, position: {latitude: 48.4 + north / 111195, longitude: -123.3}, links};
}

test('selects a connected approach about 100 metres away and ends at the house', async () => {
  const north = (id: string) => ({id, heading: 0});
  const south = (id: string) => ({id, heading: 180});
  const stops = [
    stop('house', 0, [south('dead-end'), north('one')]),
    stop('dead-end', -25, [north('house')]),
    stop('one', 20, [south('house'), north('two')]),
    stop('two', 40, [south('one'), north('three')]),
    stop('three', 60, [south('two'), north('four')]),
    stop('four', 80, [south('three'), north('five')]),
    stop('five', 100, [south('four')]),
  ];

  const result = await findStreetViewApproach(stops[0], async id => stops.find(item => item.id === id), new AbortController().signal);
  assert.deepEqual(result?.stops.map(item => item.id), ['five', 'four', 'three', 'two', 'one', 'house']);
  assert.ok(result && Math.abs(result.meters - 100) < 1);
  assert.equal(headingTo(stops[6].position, stops[0].position), 180);
});

test('declines a short approach or a disconnected jump', async () => {
  const house = stop('house', 0, [{id: 'near', heading: 0}, {id: 'far', heading: 0}]);
  const near = stop('near', 24, [{id: 'house', heading: 180}, {id: 'far', heading: 0}]);
  const far = stop('far', 101);
  const result = await findStreetViewApproach(house, async id => id === 'near' ? near : far, new AbortController().signal);
  assert.equal(result, undefined);
});

test('stops looking up panoramas when a visitor leaves the drive-by', async () => {
  const house = stop('house', 0, [{id: 'near', heading: 0}]);
  const controller = new AbortController();
  let requests = 0;
  await assert.rejects(findStreetViewApproach(house, async () => {
    requests++;
    controller.abort();
    return stop('near', 20, [{id: 'next', heading: 0}]);
  }, controller.signal), {name: 'AbortError'});
  assert.equal(requests, 1);
});
