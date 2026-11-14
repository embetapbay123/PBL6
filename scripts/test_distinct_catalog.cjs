const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),catalog=require('../data/marketplace-distinct-2026.json'),seed=require('./seed_distinct_catalog.cjs');
test('refresh defaults to a read-only plan and rejects duplicate primary photos',()=>{
 const plan=JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'seed_distinct_catalog.cjs')],{encoding:'utf8'}));assert.equal(plan.mode,'PLAN_ONLY');
 const repeated=structuredClone(catalog);repeated.products[1].photos[0]=repeated.products[0].photos[0];assert.throws(()=>seed.createPlan(repeated),/Repeated hero/);
});
test('each curated model has an authentic, unique, optimized local photo with recorded provenance',()=>{
 const manifest=require('../frontend/public/catalog/diverse-sources.json'),original=require('../frontend/public/catalog/sources.json');
 const hashes=new Set(),oldHashes=new Set(original.photos.map(p=>p.sha256));
 for(const p of catalog.products){
  const photo=manifest.photos.find(x=>x.key===p.key);assert.equal(photo.slug,p.photos[0]);assert.match(photo.source_image,/^https:\/\/burst\.shopifycdn\.com\/photos\//);assert.match(photo.observed_collection,/^https:\/\/www\.shopify\.com\/stock-photos\//);assert.equal(photo.license,'https://www.shopify.com/stock-photos/legal/terms');
  const bytes=fs.readFileSync(path.join(root,'frontend/public',photo.file));assert.equal(createHash('sha256').update(bytes).digest('hex'),photo.sha256);assert.ok(!hashes.has(photo.sha256)&&!oldHashes.has(photo.sha256));hashes.add(photo.sha256);assert.ok(photo.width<=1200&&photo.height<=1200&&photo.bytes<500000);
 }
 assert.equal(hashes.size,72);
});
test('all six Stores have sellable complete models with coherent size axes',()=>{
 for(const store of seed.storePlan)assert.equal(catalog.products.filter(p=>p.storeKey===store.key).length,12);
 for(const p of catalog.products){assert.ok(p.title.length>8&&!/TEST|· Studio|· Living/.test(p.title));assert.ok(p.price_vnd>=15000);for(const key of ['description','material','care','dimensions','product_type','category','color'])assert.ok(p[key]);
  const variants=seed.variantsFor(p);assert.equal(variants.length,p.sizes?.length??1);assert.equal(new Set(variants.map(v=>JSON.stringify(v))).size,variants.length);
 }
 assert.equal(new Set(catalog.products.map(p=>p.title)).size,72);
});
