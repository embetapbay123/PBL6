import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {orderSearch} from '../../commerce-service/src/order/order-search';
import {OrderRepository} from '../../commerce-service/src/order/order.repository';
import {ReportRepository} from '../../commerce-service/src/report/report.repository';
import {validateOperation} from '../../shared/src/request-contract';

test('search uses bound snapshot predicates and literal LIKE input without joining current catalog data',()=>{
 const args:unknown[]=['scope'];const sql=orderSearch({q:'Điện Đỏ %_',status:'PROCESSING',payment_status:'SUCCEEDED'},args);
 expect(args).toEqual(['scope','%dien do \\%\\_%','PROCESSING','SUCCEEDED']);expect(sql).toContain("search_item.product_snapshot->>'title'");expect(sql).toContain("o.address_snapshot->>'recipient_name'");expect(sql).toContain('search_item.order_id=o.id');expect(sql).toContain('o.status=$3');expect(sql).toContain('search_payment.status=$4');expect(sql).not.toContain('FROM product');expect(sql).not.toContain('Điện');
});
test.each(['pageCustomerOrders','pageStoreOrders'] as const)('%s count and page keep scope before OR search and fetch only page items',async method=>{
 const scope=randomUUID(),order=randomUUID();const query=jest.fn().mockResolvedValueOnce([{total:21}]).mockResolvedValueOnce([{id:order,status:'PROCESSING'}]).mockResolvedValueOnce([{id:randomUUID(),order_id:order,sku_snapshot:'009264'}]);
 const result=await new OrderRepository({query} as any)[method](scope,2,20,{q:'009264',status:'PROCESSING'});
 const column=method==='pageCustomerOrders'?'customer_user_id':'store_id';expect(query.mock.calls[0][0]).toContain(`WHERE o.${column} = $1 AND (`);expect(query.mock.calls[0][1]).toEqual([scope,'%009264%','PROCESSING']);expect(query.mock.calls[1][1]).toEqual([scope,'%009264%','PROCESSING',20,20]);expect(query.mock.calls[1][0]).toContain('LIMIT $4 OFFSET $5');expect(query.mock.calls[2][1]).toEqual([[order]]);expect(result.total).toBe(21);expect(result.items[0].items[0].sku_snapshot).toBe('009264');
});
test('Admin filter has parameterized Store scope and attaches only selected order snapshots',async()=>{
 const store=randomUUID(),order=randomUUID();const query=jest.fn().mockResolvedValueOnce([{total:1}]).mockResolvedValueOnce([{id:order}]).mockResolvedValueOnce([{id:randomUUID(),order_id:order,sku_snapshot:'009264'}]);
 const result=await new ReportRepository({query} as any).pageAllOrders(1,20,{q:"' OR 1=1 --",store_id:store});expect(query.mock.calls[0][1]).toEqual(["%' or 1=1 --%",store]);expect(query.mock.calls[1][0]).not.toContain("' OR 1=1 --");expect(query.mock.calls[1][1]).toEqual(["%' or 1=1 --%",store,20,0]);expect(result.items[0].items?.[0]).toMatchObject({order_id:order,sku_snapshot:'009264'});
});
test('contracts accept real order states and payment UNKNOWN while rejecting foreign scope parameters',()=>{
 for(const operation of ['listOwnOrders','listStoreOrders','listAllOrders'] as const){const result=validateOperation(operation,{query:{q:'Áo đỏ',status:'PREPARING',payment_status:'UNKNOWN'},path:{},headers:{}});expect(result.query).toMatchObject({page:1,size:20,status:'PREPARING',payment_status:'UNKNOWN'});expect(()=>validateOperation(operation,{query:{status:'DELIVERED'} as any})).toThrow();}
 for(const operation of ['listOwnOrders','listStoreOrders'] as const)expect(()=>validateOperation(operation,{query:{store_id:randomUUID()} as any})).toThrow();
 expect(validateOperation('listAllOrders',{query:{store_id:randomUUID()},path:{},headers:{}}).query.store_id).toBeDefined();
});

test('pending or UNKNOWN refund filter queries actual refund command state rather than inventing a Payment status',()=>{
 const args:unknown[]=[];const sql=orderSearch({payment_status:'SUCCEEDED',refund_status:'UNKNOWN'},args);expect(args).toEqual(['SUCCEEDED','UNKNOWN']);expect(sql).toContain('search_refund.order_id=o.id');expect(sql).toContain('search_refund.created_at DESC,search_refund.id DESC LIMIT 1)=$2');
 expect(()=>validateOperation('listAllOrders',{query:{payment_status:'REFUND_PENDING'} as any})).toThrow();expect(validateOperation('listAllOrders',{query:{refund_status:'REQUESTED'}}).query.refund_status).toBe('REQUESTED');
});
