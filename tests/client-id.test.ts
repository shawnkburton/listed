import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clientId} from '../lib/client-id';
test('HTTP previews generate valid random UUIDs without the secure-context randomUUID API',()=>{
 const fallback={getRandomValues:crypto.getRandomValues.bind(crypto)};
 const ids=Array.from({length:100},()=>clientId(fallback));
 assert.equal(new Set(ids).size,100);
 for(const id of ids)assert.match(id,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
 assert.match(clientId(),/^[a-f0-9-]{36}$/);
});
