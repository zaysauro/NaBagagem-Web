import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://localhost:3017';
// Every request is deliberately invalid. This check never creates an account or sends email.
for(const body of [{name:'',email:'invalid',password:''},{name:'Test',email:'invalid',password:'short'},{name:'Test',email:'validation-probe@example.invalid',password:'short6'}]){
 const response=await fetch(base+'/api/auth/sign-up/email',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(body)});
 assert.equal(response.status,400);const result=await response.json();assert.equal(result.code,'VALIDATION_ERROR');assert.ok(result.message);console.log('PASS signup validation without account creation');
}
