import { ModerationService } from '../../catalog-service/src/moderation/moderation.service';
import { CatalogRepository } from '../../catalog-service/src/catalog/catalog.repository';
import { schemaErrors } from '../../shared/src/contract-validation';
import bundle from '../../shared/src/contracts.runtime.generated.json';
const id='40000000-0000-4000-8000-000000000001';
const category={id,name:'Category',slug:'category',parent_id:null,status:'ACTIVE',version:7};
test('taxonomy read projections carry versions and satisfy the subsequent edit DTO',async()=>{
  const query=jest.fn().mockResolvedValueOnce([{total:1}]).mockResolvedValueOnce([category]);
  const page=await new CatalogRepository({query} as any).pageCategories(1,20);
  expect(query.mock.calls[1][0]).toContain('status,version');
  expect(page.items[0].version).toBe(7);
  expect(schemaErrors({name:'Changed',expected_version:page.items[0].version},bundle.operations.updateCategory.body)).toEqual([]);
});
test('all taxonomy writes map DB columns/nulls to their declared response and preserve current version',async()=>{
  const attribute={id,product_type_id:id,code:'size',name:'Size',data_type:'STRING',required:false,variant_factor:true,allowed_values:['A'],unit:null,version:2};
  const type={id,name:'Type',category_id:id,status:'ACTIVE',version:3,attribute_definitions:[attribute]};
  const repository=Object.fromEntries(['createCategory','updateCategory','createProductType','updateProductType','createAttributeDefinition','updateAttributeDefinition'].map(op=>[op,jest.fn(async()=>op.includes('Category')?category:op.includes('ProductType')?type:attribute)]));
  const service=new ModerationService(repository as any);
  for(const op of Object.keys(repository)){
    const args=op.startsWith('create')?[{},id,'trace']:[id,{},id,'trace'];
    const result=await (service as any)[op](...args);
    const responses=(bundle.operations as any)[op].responses;
    expect(schemaErrors(result,responses[op.startsWith('create')?'201':'200'])).toEqual([]);
    expect(result.version).toBe(op.includes('Category')?7:op.includes('ProductType')?3:2);
    expect(result).not.toHaveProperty('slug');expect(result).not.toHaveProperty('code');expect(result).not.toHaveProperty('variant_factor');
    if(op.includes('ProductType'))expect(result.attribute_definitions[0]).toMatchObject({id,variant_axis:true,version:2});
  }
});
