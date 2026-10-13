import { callOperation } from '../../api/operations';
import type { OperationOutputs } from '../../api/operations.generated';
export async function loadCart(): Promise<OperationOutputs['listCartItems']['items']> {
  const items: OperationOutputs['listCartItems']['items'] = [];
  let page = 1;
  for (;;) {
    const result = await callOperation('listCartItems', { query: { page, size: 100 } });
    items.push(...result.items);
    if (!result.items.length || page * 100 >= result.total) return items;
    page++;
  }
}
