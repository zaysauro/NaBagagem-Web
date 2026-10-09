import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://localhost:3017';
const id='00000000-0000-0000-0000-000000000001';
const protectedRoutes=['/api/trips',`/api/trips/${id}`,`/api/trips/${id}/packing`,`/api/trips/${id}/files`,'/api/profile/export','/api/profile/preferences','/api/profile/visited-countries','/api/feed','/api/notifications'];
for(const path of protectedRoutes){const r=await fetch(base+path);assert.equal(r.status,401,path);assert.match(r.headers.get('cache-control'),/no-store/);console.log('PASS unauthenticated isolation',path);}
for(const path of ['/login','/cadastro','/esqueci-senha','/redefinir-senha','/convite']){const r=await fetch(base+path);assert.equal(r.status,200,path);console.log('PASS page response',path);}
const csrf=await fetch(base+'/api/trips',{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'});assert.equal(csrf.status,403);console.log('PASS cross-origin mutation denied');
const data=await fetch(base+'/dashboard',{redirect:'manual'});assert.equal(data.status,307);assert.match(data.headers.get('location'),/login/);console.log('PASS dashboard requires login');
