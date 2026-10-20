import { readFileSync } from 'node:fs';
import { connect, one } from './db.ts';
import type { Database } from './db.ts';
import { pathToFileURL } from 'node:url';
export async function migrate(db:Database){
 const sql=readFileSync(new URL('./migrations/001_initial.sql',import.meta.url),'utf8');
 await db.transaction(async tx=>{for(const statement of sql.split(';').map(x=>x.trim()).filter(Boolean)) await tx.query(statement);if(!await one(tx,'SELECT version FROM schema_migrations WHERE version=?',['001']))await tx.query('INSERT INTO schema_migrations(version,applied_at) VALUES (?,?)',['001',new Date().toISOString()]);});
 if(!await one(db,'SELECT version FROM schema_migrations WHERE version=?',['002']))await db.transaction(async tx=>{
 const second=readFileSync(new URL('./migrations/002_automation.sql',import.meta.url),'utf8');
 for(const statement of second.split(';').map(x=>x.trim()).filter(Boolean))await tx.query(statement);
 await tx.query('INSERT INTO schema_migrations(version,applied_at) VALUES (?,?)',['002',new Date().toISOString()]);
 });
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){const db=await connect();await migrate(db);console.log('Migrações aplicadas.',db.driver);await db.close();}
