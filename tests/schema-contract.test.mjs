import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
async function* files(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=dir+'/'+entry.name;if(entry.isDirectory())yield*files(path);else if(/\.tsx?$/.test(path))yield path;}}
function tableFor(expr){if(!expr)return null;if(ts.isCallExpression(expr)&&ts.isPropertyAccessExpression(expr.expression)){if(expr.expression.name.text==='from'&&expr.arguments[0]&&ts.isStringLiteral(expr.arguments[0]))return expr.arguments[0].text;return tableFor(expr.expression.expression);}return null;}
test('existing repository projections and literal writes match Neon columns',async()=>{
 const db=new PGlite();await db.exec('create schema neon_auth;create table neon_auth."user"(id text primary key,name text,email text,"emailVerified" boolean);');
 for(const f of (await readdir('db/migrations')).sort())await db.exec(await readFile('db/migrations/'+f,'utf8'));
 const columns=(await db.query("select table_name,column_name from information_schema.columns where table_schema='public'")).rows;
 const available=new Set(columns.map(c=>c.table_name+'.'+c.column_name));const failures=[];
 for await(const file of files('app')){const ast=ts.createSourceFile(file,await readFile(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function visit(node){if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)){const table=tableFor(node.expression.expression);const method=node.expression.name.text;const arg=node.arguments[0];if(table&&arg){let used=[];
   if(method==='select'&&ts.isStringLiteral(arg)&&!/[(*:]/.test(arg.text))used=arg.text.split(',').map(x=>x.trim());
   if(['insert','update','upsert'].includes(method)&&ts.isObjectLiteralExpression(arg))used=arg.properties.filter(ts.isPropertyAssignment).map(p=>p.name.getText(ast).replace(/["']/g,''));
   for(const name of used)if(!available.has(table+'.'+name))failures.push(file+': '+table+'.'+name);
  }}ts.forEachChild(node,visit);}visit(ast);
 }
 await db.close();assert.deepEqual(failures,[]);
});
