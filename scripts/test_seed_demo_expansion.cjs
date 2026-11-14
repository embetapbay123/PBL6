const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const seed=require('./seed_demo_expansion.cjs'),catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/marketplace-catalog.json'),'utf8'));
test('defaults to a read-only plan without requiring DB secrets; reset/unknown arguments are rejected',()=>{
 const r=JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'seed_demo_expansion.cjs'),'--plan'],{encoding:'utf8',env:{...process.env,DEMO_SEED_ALLOWED:'',SEED_PASSWORD:''}}));assert.equal(r.mode,'PLAN_ONLY');assert.throws(()=>seed.options(['--reset']));assert.throws(()=>seed.options(['--output']));assert.equal(seed.options(['--apply']).apply,true);
});
test('planned catalog has unique stable identities and uses existing category-correct images',()=>{
 const p=seed.createPlan(catalog);assert.equal(p.products.length,64);assert.equal(new Set(p.products.map(p=>p.key)).size,64);assert.equal(new Set(p.products.map(p=>p.title)).size,64);
 for(const item of p.products){assert.ok(item.price_vnd>0&&Number.isSafeInteger(item.price_vnd));assert.ok(item.description&&item.material&&item.dimensions&&item.care);for(const photo of item.photos)assert.ok(fs.existsSync(path.join(__dirname,'../frontend/public/catalog',photo+'.webp')));const axes=seed.variantsFor(item);assert.ok(axes.length>=1&&axes.length<=100);assert.equal(new Set(axes.map(a=>JSON.stringify(a))).size,axes.length);}
 assert.equal(seed.idFor('order:AN:0'),seed.idFor('order:AN:0'));assert.notEqual(seed.idFor('order:AN:0'),seed.idFor('order:AN:1'));
});
test('orders cover every demo Store and reviews require completed order targets',()=>{
 assert.equal(seed.storePlan.length,6);assert.equal(seed.storePlan.filter(s=>!s.existing).length,4);assert.equal(seed.targets.length*seed.storePlan.length,54);assert.equal(seed.targets.filter(s=>s==='COMPLETED').length*seed.storePlan.length,24);assert.ok(seed.targets.includes('CANCELLED'));assert.ok(!seed.targets.includes('AWAITING_PAYMENT'));
});
