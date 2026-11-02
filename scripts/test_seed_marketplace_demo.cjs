const {test}=require('node:test'),assert=require('node:assert/strict');
const {options,validate,plan}=require('./seed_marketplace_demo.cjs');
test('seed defaults to a read-only plan and rejects unknown arguments',()=>{assert.equal(options([]).apply,false);assert.equal(options(['--apply']).apply,true);assert.throws(()=>options(['--reset']));});
test('seed cannot write without explicit demo opt-in, complete DB config and a private password',()=>{
 const base={NODE_ENV:'development',DEMO_SEED_ALLOWED:'1',SEED_PASSWORD:'test-only-password',M1_DATABASE_URL:'x',M2_DATABASE_URL:'x',M3_DATABASE_URL:'x',M4_DATABASE_URL:'x'};
 validate(base);
 for(const env of [{...base,NODE_ENV:'production'},{...base,DEMO_SEED_ALLOWED:''},{...base,SEED_PASSWORD:''},{...base,M4_DATABASE_URL:''}])assert.throws(()=>validate(env));
});
test('test dataset includes roles and meaningful boundaries without simulated online success',()=>{assert.equal(plan.accounts.length,7);assert.equal(plan.stores,2);assert.equal(plan.variants,34);assert.equal(plan.order_examples,17);assert.match(plan.online,/no payment attempts or bank callbacks/);assert.equal(new Set(plan.accounts.map(p=>p.email)).size,7);});
