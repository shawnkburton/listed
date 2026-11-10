import {test} from 'node:test';
import assert from 'node:assert/strict';
import {showingISO,pacificDay} from '../lib/showing-time';
test('hour, minute and AM/PM selections convert midnight, noon and afternoon to Pacific time',()=>{
 assert.equal(showingISO('2026-09-30','12','00','AM'),'2026-09-30T07:00:00.000Z');
 assert.equal(showingISO('2026-09-30','12','00','PM'),'2026-09-30T19:00:00.000Z');
 assert.equal(showingISO('2026-09-30','2','30','PM'),'2026-09-30T21:30:00.000Z');
 assert.equal(showingISO('2025-12-01','2','05','PM'),'2025-12-01T22:05:00.000Z');
});
test('invalid and missing selections are rejected, including nonexistent spring-forward times',()=>{
 for(const args of [['','2','00','PM'],['2026-09-30','','00','PM'],['2026-09-30','2','','PM'],['2026-09-30','2','00',''],['2026-02-30','2','00','PM'],['2026-09-30','13','00','PM'],['2026-09-30','2','60','PM'],['2026-03-08','2','30','AM']])assert.equal(showingISO(...args as [string,string,string,string]),'');
 assert.equal(showingISO('2026-03-08','3','30','AM'),'2026-03-08T10:30:00.000Z');
 assert.equal(pacificDay(Date.parse('2026-10-01T01:00:00Z')),'2026-09-30');
});
