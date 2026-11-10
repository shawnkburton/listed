import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
test('migration backup captures committed WAL data and media without overwriting a backup',()=>{
 const folder=mkdtempSync(join(tmpdir(),'listed-backup-test-')),source=join(folder,'source.sqlite'),target=join(folder,'backup'),videos=join(folder,'videos');
 const db=new DatabaseSync(source);try{
  db.exec("PRAGMA journal_mode=WAL; CREATE TABLE test(value TEXT); INSERT INTO test VALUES ('committed in WAL');");
  mkdirSync(videos);writeFileSync(join(videos,'fixture'),'fictional video');
  const env={...process.env,LISTED_DATABASE_PATH:source,LISTED_VIDEO_DIRECTORY:videos};
  const result=spawnSync(process.execPath,[resolve('scripts/backup-data.mjs'),target],{env,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  const copy=new DatabaseSync(join(target,'marketplace.sqlite'));try{assert.equal(copy.prepare('SELECT value FROM test').get()?.value,'committed in WAL');}finally{copy.close();}
  assert.equal(readFileSync(join(target,'videos','fixture'),'utf8'),'fictional video');
  assert.notEqual(spawnSync(process.execPath,[resolve('scripts/backup-data.mjs'),target],{env}).status,0);
 }finally{db.close();rmSync(folder,{recursive:true,force:true});}
});
