import {CatalogRepository} from '../../catalog-service/src/catalog/catalog.repository';
import {InventoryRepository} from '../../catalog-service/src/inventory/inventory.repository';
import {OrderRepository} from '../../commerce-service/src/order/order.repository';
const manager=()=>({query:jest.fn().mockResolvedValueOnce([{total:30}]).mockResolvedValueOnce([])});
test('product sorting is whitelisted, scoped and happens before LIMIT/OFFSET',async()=>{
 const m=manager();await new CatalogRepository(m as any).pageOwnStore('store',2,20,{sort:'PRICE_DESC',status:'DRAFT'});
 expect(m.query.mock.calls[1][0]).toContain('min(price_vnd)');expect(m.query.mock.calls[1][0]).toContain('DESC NULLS LAST,p.id LIMIT');expect(m.query.mock.calls[1][1]).toEqual(['store',null,'DRAFT',20,20]);
 const bad=manager();await new CatalogRepository(bad as any).pageOwnStore('store',1,20,{sort:'DROP TABLE product'});expect(bad.query.mock.calls[1][0]).not.toContain('DROP');
});
test('stock tabs filter before count and paging, and sorting retains Store scope',async()=>{
 const m=manager();await new InventoryRepository(m as any).pageInventory('store',2,20,{stock:'LOW',sort:'AVAILABLE_ASC'});
 expect(m.query.mock.calls[0][0]).toContain('BETWEEN 1 AND 4');expect(m.query.mock.calls[1][0]).toContain('BETWEEN 1 AND 4');expect(m.query.mock.calls[1][1]).toEqual(['store',20,20]);expect(m.query.mock.calls[1][0]).toContain('ASC, i.variant_id LIMIT');
});
test('order money sorting is global before pagination and retains ownership',async()=>{
 const m=manager();await new OrderRepository(m as any).pageStoreOrders('store',2,20,{sort:'TOTAL_DESC'});
 expect(m.query.mock.calls[1][0]).toContain('WHERE o.store_id = $1');expect(m.query.mock.calls[1][0]).toContain('ORDER BY o.payable_vnd DESC, o.id ASC');expect(m.query.mock.calls[1][1]).toEqual(['store',20,20]);
});
