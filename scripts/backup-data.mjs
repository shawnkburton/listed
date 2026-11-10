// Run with Node 24+. Quiesce writers during final cutover so media and DB agree.
import {DatabaseSync} from 'node:sqlite';
import {mkdir,cp,chmod,writeFile,stat} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
const destination=process.argv[2];
if(!destination)throw Error('Usage: node scripts/backup-data.mjs /absolute/new-backup-directory');
const target=resolve(destination),source=resolve(process.env.LISTED_DATABASE_PATH||'.data/marketplace.sqlite');
const videos=resolve(process.env.LISTED_VIDEO_DIRECTORY||join(dirname(source),'videos'));
if(target===dirname(source)||target.startsWith(videos+'/'))throw Error('Choose a separate backup directory.');
process.umask(0o077);
await mkdir(target,{mode:0o700}); // Deliberately refuses to overwrite a backup.
const db=new DatabaseSync(source,{readOnly:true});
try{db.prepare('VACUUM INTO ?').run(join(target,'marketplace.sqlite'));}finally{db.close();}
await chmod(join(target,'marketplace.sqlite'),0o600);
const mediaExists=await stat(videos).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;});
if(mediaExists)await cp(videos,join(target,'videos'),{recursive:true,errorOnExist:true,force:false});
await writeFile(join(target,'backup.json'),JSON.stringify({createdAt:new Date().toISOString(),database:'marketplace.sqlite',media:'videos',note:'Stop writers for the final migration backup.'},null,2));
console.log('Private database and media backup saved. Keep this directory out of Git and public web folders.');
