jest.mock('../../shared/src/database',()=>({database:{manager:{query:(...args:any[])=>mockQuery(...args)},transaction:(fn:any)=>fn({query:(...args:any[])=>mockQuery(...args)})}}));
jest.mock('../../shared/src/audit',()=>({audit:jest.fn()}));
const mockQuery=jest.fn(),call=jest.fn();
import { ReviewService } from '../../catalog-service/src/review/review.service';
const service=()=>new ReviewService(()=>({call}) as any);
const row=(values:Record<string,unknown>={})=>({id:'review',product_id:'product',order_item_id:'item',customer_user_id:'buyer',rating:5,body:'Đúng mô tả',status:'VISIBLE',version:0,...values});
beforeEach(()=>{mockQuery.mockReset();call.mockReset();});

test('ineligible or unavailable Order checks cannot write a review',async()=>{
  call.mockResolvedValueOnce({eligible:false});await expect(service().create({order_item_id:'item',rating:5},'other','trace')).rejects.toMatchObject({status:409});
  call.mockRejectedValueOnce(new Error('offline'));await expect(service().create({order_item_id:'item',rating:5},'buyer','trace')).rejects.toThrow('offline');
  expect(mockQuery).not.toHaveBeenCalled();
});
test('creation uses the canonical purchased Product and persists an audit',async()=>{
  call.mockResolvedValueOnce({eligible:true,product_id:'canonical'});
  mockQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([row({product_id:'canonical'})]).mockResolvedValueOnce([]);
  await expect(service().create({order_item_id:'item',rating:5,body:' Đúng mô tả '},'buyer','trace')).resolves.toMatchObject({product_id:'canonical',version:0});
  expect(mockQuery.mock.calls[2][1]).toEqual(['canonical','item','buyer',5,'Đúng mô tả']);
  expect(call).toHaveBeenCalledWith('VerifyReviewEligibility',{order_item_id:'item',customer_user_id:'buyer'},'trace');
});
test('an identical create retry reuses the review, different content conflicts',async()=>{
  call.mockResolvedValue({eligible:true,product_id:'product'});
  mockQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([row()]);
  await expect(service().create({order_item_id:'item',rating:5,body:'Đúng mô tả'},'buyer','trace')).resolves.toMatchObject({id:'review'});
  mockQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([row()]);
  await expect(service().create({order_item_id:'item',rating:1},'buyer','trace')).rejects.toMatchObject({status:409});
  expect(mockQuery.mock.calls.some(([sql])=>sql.startsWith('INSERT'))).toBe(false);
});
test('updates guard ownership/version before checking eligibility and keep hidden status',async()=>{
  mockQuery.mockResolvedValueOnce([]);await expect(service().update('review',{rating:4,expected_version:0},'other','trace')).rejects.toMatchObject({status:404});
  mockQuery.mockResolvedValueOnce([row({version:1})]);await expect(service().update('review',{rating:4,expected_version:0},'buyer','trace')).rejects.toMatchObject({status:409});expect(call).not.toHaveBeenCalled();
  mockQuery.mockResolvedValueOnce([row({status:'HIDDEN'})]).mockResolvedValueOnce([[row({status:'HIDDEN',version:1,rating:4})],1]).mockResolvedValueOnce([]);call.mockResolvedValueOnce({eligible:true});
  await expect(service().update('review',{rating:4,expected_version:0},'buyer','trace')).resolves.toMatchObject({status:'HIDDEN',rating:4,version:1});
  expect(mockQuery.mock.calls.find(([sql])=>sql.startsWith('UPDATE'))?.[0]).not.toContain('status=');
});
test('moderation requires a reason and current version, writes both audit trails',async()=>{
  await expect(service().moderate('review',{reason:' ',expected_version:0},'admin','trace',false)).rejects.toMatchObject({status:422});expect(mockQuery).not.toHaveBeenCalled();
  mockQuery.mockResolvedValueOnce([row()]).mockResolvedValueOnce([[row({status:'HIDDEN',version:1})],1]).mockResolvedValueOnce([]);
  await expect(service().moderate('review',{reason:'Nội dung vi phạm',expected_version:0},'admin','trace',false)).resolves.toMatchObject({status:'HIDDEN',version:1});
  expect(mockQuery.mock.calls[1][1]).toEqual(['review','HIDDEN','Nội dung vi phạm']);
  expect(mockQuery.mock.calls[2][1]).toEqual(['review','admin','HIDE','Nội dung vi phạm']);
});
test('public reads exclude hidden reviews and inactive products',async()=>{
  call.mockResolvedValue({ids:['store']});mockQuery.mockResolvedValueOnce([]);
  await expect(service().list('product',{},'trace')).rejects.toMatchObject({status:404});
  mockQuery.mockResolvedValueOnce([{id:'product'}]).mockResolvedValueOnce([{total:1}]).mockResolvedValueOnce([row()]);
  await expect(service().list('product',{page:2,size:5},'trace')).resolves.toMatchObject({page:2,size:5,total:1});
  expect(mockQuery.mock.calls[3]).toEqual([expect.stringContaining("status='VISIBLE'"),['product',null,5,5]]);
});


test('owned reads include hidden content with exact Customer scope and filters, independent of public catalog',async()=>{
 mockQuery.mockResolvedValueOnce([{total:1}]).mockResolvedValueOnce([row({status:'HIDDEN',version:7})]);
 await expect(service().listOwn('buyer',{product_id:'product',order_item_id:'item',page:2,size:10})).resolves.toMatchObject({total:1,items:[{status:'HIDDEN',version:7}]});
 expect(call).not.toHaveBeenCalled();expect(mockQuery.mock.calls[0][0]).toContain('r.customer_user_id=$1');expect(mockQuery.mock.calls[1][1]).toEqual(['buyer','product','item',10,10]);expect(mockQuery.mock.calls[1][0]).not.toContain("status='VISIBLE'");
});
