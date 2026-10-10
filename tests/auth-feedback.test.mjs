import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authFeedback,signupValidation} from '../lib/auth-feedback.ts';
test('signup rejects invalid fields and short passwords without trimming secrets',()=>{
 assert.match(signupValidation('Nome','person@example.com','123456'),/8 caracteres/);
 assert.match(signupValidation(' ','person@example.com','12345678'),/nome/);
 assert.match(signupValidation('Nome','person','12345678'),/e-mail/);
 assert.equal(signupValidation(' Nome ',' person@example.com ',' 123456 '),null);
});
test('auth errors distinguish provider configuration from invalid credentials',()=>{
 assert.match(authFeedback({code:'INVALID_ORIGIN',message:'Invalid origin'},'signup',403),/endereço/);
 assert.match(authFeedback({error:{code:'PASSWORD_TOO_SHORT'}},'signup',400),/8 caracteres/);
 assert.match(authFeedback({error:'invalid login'},'login',400),/E-mail ou senha incorretos/);
 assert.match(authFeedback({message:'invalid login'},'signup',400),/criar a conta/);
 assert.match(authFeedback({},'signup',429),/Muitas tentativas/);
 assert.doesNotMatch(authFeedback({message:'postgres password=private'},'signup',500),/private/);
});
