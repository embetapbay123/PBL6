import {Button as UiButton} from '../../components/ui/Button';
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { OperationOutputs } from "../../api/operations.generated";
import { callOperation } from "../../api/operations";
import { ErrorView, Pagination } from "../../bootstrap/components";
export function AuditIdentityLookup({
  kind,
  onPick,
}: {
  kind: "user" | "store";
  onPick: (id: string) => void;
}) {
  const [draft, setDraft] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1);
  const query = useQuery<
    OperationOutputs["listUsers"] | OperationOutputs["listStores"]
  >({
    queryKey: ["audit-identity-lookup", kind, search, page],
    enabled: !!search,
    queryFn: () =>
      kind === "user"
        ? callOperation("listUsers", { query: { q: search, page, size: 10 } })
        : callOperation("listStores", { query: { q: search, page, size: 10 } }),
  });
  return (
    <div className="audit-lookup">
      <label>
        {kind === "user"
          ? "Tìm người theo tên hoặc email"
          : "Tìm gian hàng theo tên"}
        <input
          value={draft}
          maxLength={200}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={!draft.trim() || query.isFetching}
        onClick={() => {
          setSearch(draft.trim());
          setPage(1);
        }}
      >
        Tìm {kind === "user" ? "người thực hiện" : "Store"}
      </button>
      {query.isFetching && <p role="status">Đang tìm…</p>}
      {query.error && (
        <ErrorView error={query.error} onRetry={() => void query.refetch()} />
      )}
      <ul>
        {!query.isFetching &&
          query.data?.items.map((item) => (
            <li key={item.id}>
              <UiButton
                type="button"
                variant="secondary"
                onClick={() => onPick(item.id)}
              >
                {"email" in item ? item.display_name || item.email : item.name}
                <small>#{item.id.slice(-8).toUpperCase()}</small>
              </UiButton>
            </li>
          ))}
      </ul>
      {query.data && !query.isFetching && !query.data.items.length && (
        <p>Không có kết quả phù hợp.</p>
      )}
      {query.data && (
        <Pagination
          page={page}
          size={query.data.size}
          total={query.data.total}
          onPage={setPage}
        />
      )}
    </div>
  );
}
