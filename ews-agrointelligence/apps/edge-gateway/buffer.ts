import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export class BufferStore {
 db:DatabaseSync;max:number;
 constructor(path:string,max=100000){if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});this.db=new DatabaseSync(path);this.max=max;this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS queue(sequence INTEGER PRIMARY KEY AUTOINCREMENT,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);');}
 push(payload:Record<string,any>){if(this.size()>=this.max)throw new Error('Buffer cheio: coleta interrompida para preservar dados.');const r=this.db.prepare('INSERT INTO queue(payload) VALUES (?)').run(JSON.stringify(payload));return Number(r.lastInsertRowid);}
 batch(limit=100){return this.db.prepare('SELECT sequence,payload FROM queue ORDER BY sequence LIMIT ?').all(limit).map((r:any)=>({...JSON.parse(r.payload),sequence:r.sequence}));}
 ack(sequences:number[]){this.db.exec('BEGIN IMMEDIATE');try{const s=this.db.prepare('DELETE FROM queue WHERE sequence=?');for(const n of sequences)s.run(n);this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}}
 size(){return Number((this.db.prepare('SELECT COUNT(*) AS n FROM queue').get() as any).n);}
 close(){this.db.close();}
}
export async function flush(store:BufferStore,url:string,credential:string,fetcher:typeof fetch=fetch){const rows=store.batch();if(!rows.length)return 0;const response=await fetcher(url+'/api/ingest',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+credential},body:JSON.stringify({readings:rows}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`Ingestão rejeitada: HTTP ${response.status}. Buffer preservado.`);const result:any=await response.json();if(result.accepted+result.duplicates!==rows.length)throw new Error('Confirmação incompleta: buffer preservado.');store.ack(rows.map(x=>x.sequence));return rows.length;}
