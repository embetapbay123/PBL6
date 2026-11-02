jest.mock('../../shared/src/database',()=>({database:{transaction:(fn:any)=>fn({query:(...args:any[])=>mockQuery(...args)})}}));
const mockQuery=jest.fn();
import {ModerationRepository} from '../../catalog-service/src/moderation/moderation.repository';
beforeEach(()=>mockQuery.mockReset());
test('taxonomy rejects blank names, unsupported types, invalid codes and self parenting before SQL',async()=>{
  const repo=new ModerationRepository();
  await expect(repo.createCategory({name:'   '},'admin','trace')).rejects.toMatchObject({status:422});
  await expect(repo.createAttributeDefinition({name:'Size',product_type_id:'type',data_type:'SQL'},'admin','trace')).rejects.toMatchObject({status:422});
  await expect(repo.createAttributeDefinition({name:'Size',code:'bad-code',product_type_id:'type',data_type:'STRING'},'admin','trace')).rejects.toMatchObject({status:422});
  await expect(repo.updateCategory('category',{parent_id:'category',expected_version:0},'admin','trace')).rejects.toMatchObject({status:422});expect(mockQuery).not.toHaveBeenCalled();
});
test('taxonomy uniqueness and foreign references return actionable errors instead of 500',async()=>{
  const repo=new ModerationRepository();mockQuery.mockRejectedValueOnce({driverError:{code:'23505'}});
  await expect(repo.createCategory({name:'Existing'},'admin','trace')).rejects.toMatchObject({status:409,response:{code:'TAXONOMY_CONFLICT'}});
  mockQuery.mockRejectedValueOnce({driverError:{code:'23503'}});
  await expect(repo.createProductType({name:'Type',category_id:'missing'},'admin','trace')).rejects.toMatchObject({status:422,response:{code:'REFERENCE_INVALID'}});
});

test('moving a category beneath a descendant is rejected before UPDATE',async()=>{
  mockQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([{id:'parent',version:2}]).mockResolvedValueOnce([{id:'parent'}]);
  await expect(new ModerationRepository().updateCategory('parent',{parent_id:'child',expected_version:2},'admin','trace')).rejects.toMatchObject({status:422,response:{code:'CATEGORY_CYCLE'}});
  expect(mockQuery.mock.calls.some(([sql])=>sql.startsWith('UPDATE'))).toBe(false);
});
