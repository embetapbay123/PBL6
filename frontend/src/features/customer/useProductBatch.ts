import { useQuery } from "@tanstack/react-query";
import { callOperation } from "../../api/operations";
import { ApiError } from "../../api/client";
import type { OperationOutputs } from "../../api/operations.generated";
export function useProductBatch(productIds: string[]) {
  const ids = [...new Set(productIds)].sort();
  return useQuery({
    queryKey: ["product-batch", ids],
    enabled: ids.length > 0,
    staleTime: 30000,
    retry: false,
    queryFn: async ({ signal }) => {
      const result: OperationOutputs["getProduct"][] = [];
      // Sequential, bounded batches avoid N+1 requests and large parallel request bursts.
      for (let offset = 0; offset < ids.length; offset += 100) {
        const requested = ids.slice(offset, offset + 100);
        const page = await callOperation(
          "listProducts",
          { query: { ids: requested.join(","), page: 1, size: 100 } },
          { signal },
        );
        if (
          !Array.isArray(page.items) ||
          page.items.some(
            (p) => typeof p.id !== "string" || !requested.includes(p.id),
          )
        )
          throw new ApiError(
            503,
            "PRODUCT_BATCH_INVALID",
            "Chưa đọc được đúng thông tin các món trong danh sách.",
          );
        result.push(...page.items);
      }
      return result;
    },
  });
}
