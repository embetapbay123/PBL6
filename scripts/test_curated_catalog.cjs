const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {readCatalog,variantsFor}=require('./seed_curated_catalog.cjs');
const catalog=readCatalog(path.join(__dirname,'../data/marketplace-catalog.json'));
test('curated catalog covers four real categories, both Stores, unique products and meaningful stock/variant cases',()=>{
 assert.equal(catalog.products.length,32);assert.equal(new Set(catalog.products.map(p=>p.photos[0])).size,32);assert.equal(catalog.products.reduce((n,p)=>n+variantsFor(p).length,0),64);
 for(const category of catalog.categories)assert.equal(catalog.products.filter(p=>p.category===category).length,8);
 assert.equal(variantsFor(catalog.products[0]).length,12);assert.equal(new Set(catalog.products.map(p=>p.store)).size,2);
 for(const p of catalog.products){assert(p.title.length>8&&!p.title.includes('[DEMO]'));assert(p.description.length>70);assert(Number.isSafeInteger(p.price_vnd)&&p.price_vnd>0);assert(p.material&&p.dimensions&&p.care);}
});
test('every catalog image has a local optimized asset and a verifiable source manifest',()=>{
 const base=path.join(__dirname,'../frontend/public/catalog'),manifest=JSON.parse(fs.readFileSync(path.join(base,'sources.json'),'utf8'));
 const {createHash}=require('node:crypto');for(const slug of new Set([...catalog.products.flatMap(p=>p.photos),...Object.values(catalog.collection_photos)])){
  const record=manifest.photos.find(p=>p.slug===slug);assert(record,'source missing: '+slug);const bytes=fs.readFileSync(path.join(base,slug+'.webp'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);assert(record.source_page.startsWith('https://www.shopify.com/stock-photos/photos/'));assert(record.license.startsWith('https://www.shopify.com/'));assert(record.width<=1200&&record.height<=1200);assert(bytes.length<350000);
 }
});
