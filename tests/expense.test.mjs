import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expenseInput,sumMoney} from '../lib/expense-validation.ts';
test('expense validation preserves decimal strings and rejects invalid input',()=>{
 assert.equal(expenseInput({title:'Hotel',amount:'10.23',currency:'brl'}).amount,'10.23');
 for(const amount of ['NaN','Infinity','-1','1.234','1e10'])assert.throws(()=>expenseInput({title:'Hotel',amount}));
 assert.throws(()=>expenseInput({title:'Hotel',amount:'1',expense_date:'2026-02-30'}));
 assert.throws(()=>expenseInput({title:'Hotel',amount:'1',currency:'BRLX'}));
 assert.equal(sumMoney(['0.10','0.20']),0.3);
});
