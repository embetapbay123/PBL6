import {CatalogRepository} from '../../catalog-service/src/catalog/catalog.repository';
import {productResponse} from '../../catalog-service/src/catalog/catalog.mapper';
import {validateOperation} from '../../shared/src/request-contract';
test('price range applies the same parameterized in-stock variant predicate to count and page',async()=>{
 const manager={query:jest.fn().mockResolvedValueOnce([{total:0}]).mockResolvedValueOnce([])};
 const result=await new CatalogRepository(manager as any).page(['store'],{page:2,size:20,min_price_vnd:90000,max_price_vnd:200000,sort:'price_asc'});
 expect(result).toMatchObject({total:0,page:2,size:20});
 for(const [sql,args] of manager.query.mock.calls){expect(sql).toContain('fi.quantity>fi.reserved_quantity');expect(sql).toContain('fv.price_vnd>=$3');expect(sql).toContain('fv.price_vnd<=$4');expect(args.slice(0,4)).toEqual([['store'],'%',90000,200000]);}
 expect(manager.query.mock.calls[1][1].slice(-2)).toEqual([20,20]);
});
test.each([-1,0.5,'not-a-number',Number.MAX_SAFE_INTEGER+1])('invalid range value %s is rejected by the HTTP contract',value=>{
 expect(()=>validateOperation('listProducts',{query:{min_price_vnd:value} as any})).toThrow();
});
test('valid numeric URL query is normalized before the repository reads it',()=>{
 expect(validateOperation('listProducts',{query:{min_price_vnd:'1000',max_price_vnd:'2000'} as any}).query).toMatchObject({min_price_vnd:1000,max_price_vnd:2000});
});
test('variant image metadata remains optional, is returned only for its own product and supports exact item identity',()=>{
 const row={id:'p',store_id:'s',product_type_id:'t',title:'Shirt',attributes:{},status:'ACTIVE',moderation_status:'VISIBLE',version:0};
 const result=productResponse(row,[],[{id:'red',product_id:'p',variant_id:'red-small',image_url:'https://example.test/red.webp',position:1},{id:'other',product_id:'other',variant_id:'bad',image_url:'https://example.test/bad.webp'}]);
 expect(result.images).toEqual([{id:'red',product_id:'p',variant_id:'red-small',image_url:'https://example.test/red.webp',position:1}]);
});

test('search query orders by title match before description match while keeping price sort when requested',async()=>{
 const manager={query:jest.fn().mockResolvedValueOnce([{total:0}]).mockResolvedValueOnce([])};
 await new CatalogRepository(manager as any).page(['store'],{page:1,size:20,q:'áo',sort:'title'});
 expect(manager.query.mock.calls[1][0]).toContain("CASE WHEN marketplace_search(p.title) ~ ('\\m' || $2) THEN 0 ELSE 1 END, p.title ASC, p.id");
 const priceManager={query:jest.fn().mockResolvedValueOnce([{total:0}]).mockResolvedValueOnce([])};
 await new CatalogRepository(priceManager as any).page(['store'],{page:1,size:20,q:'áo',sort:'price_asc'});
 expect(priceManager.query.mock.calls[1][0]).toContain('min_price ASC NULLS LAST, p.id');
});
