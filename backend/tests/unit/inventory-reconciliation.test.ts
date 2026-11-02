import {reconcileInventory} from '../../catalog-service/src/inventory/inventory-reconciliation';
import type {StockMovementRow} from '../../catalog-service/src/inventory/inventory.repository';
import {schemaErrors} from '../../shared/src/contract-validation';
import bundle from '../../shared/src/contracts.runtime.generated.json';
const id='13000000-0000-4000-8000-000000000001',at=(n:number)=>new Date(Date.UTC(2026,10,1,0,n)).toISOString();
function ledger(){let q=0,r=0;return [[10,0],[0,3],[-3,-3],[5,0],[-5,0],[3,0]].map(([dq,dr],i)=>{const row={id,variant_id:id,order_id:null,delta_quantity:dq,delta_reserved:dr,reason:'test',occurred_at:at(0),recorded_at:at(i),inventory_version:i+1,quantity_before:q,reserved_before:r,quantity_after:q+dq,reserved_after:r+dr};q+=dq;r+=dr;return row;});}
const current={variant_id:id,quantity:10,reserved_quantity:0,available_quantity:10,version:6};
test('half-open period reconciles quantity and reservations separately, excluding later restock and current balance',()=>{
 const result=reconcileInventory(current,ledger(),at(1),at(5),at(6));expect(result).toMatchObject({coverage:'COMPLETE',opening:{quantity:10,reserved_quantity:0},closing:{quantity:7,reserved_quantity:0},totals:{quantity_in:5,quantity_out:8,reserved_in:3,reserved_out:3,movement_count:4},current:{quantity:10}});expect(schemaErrors(result,bundle.operations.getInventoryReconciliation.responses['200'])).toEqual([]);
});
test('period beginning at consume keeps the reservation at opening; consume reduces both quantities once',()=>{
 const result=reconcileInventory(current,ledger(),at(2),at(3),at(6));expect(result.opening).toEqual({quantity:10,reserved_quantity:3,available_quantity:7});expect(result.closing).toEqual({quantity:7,reserved_quantity:0,available_quantity:7});
});
test('old transaction-start time is not used instead of the trusted write time; open periods stop at as-of',()=>{
 const rows=ledger().map(row=>({...row,occurred_at:at(0)}));const result=reconcileInventory(current,rows,at(3),at(10),at(6));expect(result.period_open).toBe(true);expect(result.effective_to).toBe(at(6));expect(result.totals.movement_count).toBe(3);expect(result.closing?.quantity).toBe(10);
});
test('legacy prefix does not receive invented dates or balances; a contiguous trusted suffix can anchor a recent period',()=>{
 const rows:StockMovementRow[]=ledger().map((row,i)=>i<4?{...row,recorded_at:null}:row);const old=reconcileInventory(current,rows,at(0),at(6),at(7));expect(old.coverage).toBe('INCOMPLETE');expect(old.issues).toContain('LEGACY_PERIOD');expect(old).not.toHaveProperty('opening');expect(old.totals.undated_count).toBe(4);
 const recent=reconcileInventory(current,rows,at(4),at(6),at(7));expect(recent.coverage).toBe('COMPLETE');expect(recent.opening?.quantity).toBe(12);expect(recent.closing?.quantity).toBe(10);
});
test.each(['gap','duplicate','balances','time','current'])('incomplete %s history cannot produce a verified period',kind=>{
 const rows=ledger();let balance=current;if(kind==='gap')rows.splice(2,1);if(kind==='duplicate')rows[2].inventory_version=rows[1].inventory_version;if(kind==='balances')rows[2].quantity_before++;if(kind==='time')rows[2].recorded_at=at(0);if(kind==='current')balance={...current,quantity:99,available_quantity:99};const result=reconcileInventory(balance,rows,at(0),at(6),at(7));expect(result.coverage).toBe('INCOMPLETE');expect(result).not.toHaveProperty('opening');expect(result).not.toHaveProperty('closing');
});
test('untouched zero stock has a zero period; nonzero seeded stock without history remains unknown',()=>{
 expect(reconcileInventory({...current,quantity:0,available_quantity:0,version:0},[],at(0),at(6),at(7))).toMatchObject({coverage:'COMPLETE',opening:{quantity:0},closing:{quantity:0}});expect(reconcileInventory({...current,version:0},[],at(0),at(6),at(7))).toMatchObject({coverage:'INCOMPLETE',issues:['NO_TRUSTED_HISTORY']});
});
