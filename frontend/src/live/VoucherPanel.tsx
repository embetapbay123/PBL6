import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { callOperation } from "../api/operations";
import type {
  OperationInputs,
  OperationOutputs,
} from "../api/operations.generated";
import { ErrorView, Loading, Pagination } from "../bootstrap/components";
import { formatMoney, useCommand } from "./useLiveData";

type Voucher = OperationOutputs["createStoreVoucher"];
const localDateTime = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

/** Store is derived by the server from the authenticated membership, never from an editable ID. */
export function VoucherPanel({ scope }: { scope: "STORE" | "PLATFORM" }) {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [usage, setUsage] = useState<{
    code: string;
    value: OperationOutputs["getStoreVoucherUsage"];
  }>();
  const command = useCommand();
  const list = useQuery({
    queryKey: ["vouchers", scope, page],
    queryFn: () =>
      scope === "STORE"
        ? callOperation("listStoreVouchers", { query: { page, size: 20 } })
        : callOperation("listPlatformVouchers", { query: { page, size: 20 } }),
  });

  const stop = (voucher: Voucher) => {
    if (!voucher.id || voucher.version === undefined) return;
    void command.run(async () => {
      try {
        const input = {
          path: { id: voucher.id! },
          body: {
            status: "STOPPED" as const,
            expected_version: voucher.version!,
          },
        };
        if (scope === "STORE") await callOperation("updateStoreVoucher", input);
        else await callOperation("updatePlatformVoucher", input);
        command.setNotice("Đã dừng voucher " + voucher.code + ".");
      } finally {
        // A conflict or uncertain response requires a fresh version before another attempt.
        await list.refetch();
      }
    });
  };
  const showUsage = (voucher: Voucher) =>
    void command.run(async () => {
      setUsage(undefined);
      if (!voucher.id) return;
      const input = { path: { id: voucher.id } };
      const value =
        scope === "STORE"
          ? await callOperation("getStoreVoucherUsage", input)
          : await callOperation("getPlatformVoucherUsage", input);
      setUsage({ code: voucher.code, value });
    });

  return (
    <section>
      <h1>{scope === "STORE" ? "Voucher gian hàng" : "Voucher toàn sàn"}</h1>
      <p className="text-slate-500">
        Theo dõi ưu đãi, giới hạn sử dụng và số lượt đã áp dụng.
      </p>
      <button onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Đóng form tạo" : "Tạo voucher mới"}
      </button>
      {showForm && (
        <CreateVoucher
          scope={scope}
          done={() => {
            setShowForm(false);
            void list.refetch();
          }}
        />
      )}
      {command.error != null && <ErrorView error={command.error} />}
      {command.notice && <p role="status">{command.notice}</p>}
      {usage && (
        <div className="boot-card" role="status">
          <h3>Lượt dùng {usage.code}</h3>
          <p>
            Đang giữ: {usage.value.reserved_count} · Đã dùng:{" "}
            {usage.value.redeemed_count} · Còn lại:{" "}
            {usage.value.remaining_count}
          </p>
        </div>
      )}
      {list.error ? (
        <ErrorView error={list.error} onRetry={() => void list.refetch()} />
      ) : !list.data ? (
        <Loading />
      ) : (
        <>
          <div className="boot-card market-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Mã voucher</th>
                  <th>Ưu đãi</th>
                  <th>Điều kiện</th>
                  <th>Thời hạn</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((v) => (
                  <tr key={v.id ?? v.code}>
                    <td>
                      <strong>{v.code}</strong>
                    </td>
                    <td>
                      {v.discount_type === "PERCENT"
                        ? v.discount_value + "%"
                        : formatMoney(v.discount_value)}
                      {v.max_discount_vnd != null && (
                        <p>Tối đa {formatMoney(v.max_discount_vnd)}</p>
                      )}
                    </td>
                    <td>
                      Đơn từ {formatMoney(v.min_goods_vnd ?? 0)}
                      <p>
                        {v.usage_limit} lượt · {v.per_customer_limit}/khách
                      </p>
                    </td>
                    <td>
                      {new Date(v.starts_at).toLocaleString("vi-VN")}
                      <p>đến {new Date(v.ends_at).toLocaleString("vi-VN")}</p>
                    </td>
                    <td>
                      <span className="market-badge">{v.status ?? "—"}</span>
                    </td>
                    <td>
                      <button
                        disabled={command.busy || !v.id}
                        onClick={() => showUsage(v)}
                      >
                        Xem lượt dùng
                      </button>
                      {v.status === "ACTIVE" && (
                        <button
                          disabled={
                            command.busy ||
                            list.isFetching ||
                            !v.id ||
                            v.version === undefined
                          }
                          onClick={() => stop(v)}
                        >
                          Dừng voucher
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!list.data.items.length && <p>Chưa có voucher ở trang này.</p>}
          </div>
          <Pagination
            page={page}
            size={list.data.size}
            total={list.data.total}
            onPage={setPage}
          />
        </>
      )}
    </section>
  );
}

function CreateVoucher({
  scope,
  done,
}: {
  scope: "STORE" | "PLATFORM";
  done: () => void;
}) {
  const command = useCommand();
  const [code, setCode] = useState(""),
    [type, setType] = useState<"FIXED" | "PERCENT">("FIXED");
  const [value, setValue] = useState(10000),
    [minimum, setMinimum] = useState(50000),
    [cap, setCap] = useState(50000);
  const [limit, setLimit] = useState(100),
    [perCustomer, setPerCustomer] = useState(1);
  const [start, setStart] = useState(() => localDateTime(new Date()));
  const [end, setEnd] = useState(() =>
    localDateTime(new Date(Date.now() + 30 * 86400000)),
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void command.run(async () => {
      const body: OperationInputs["createStoreVoucher"]["body"] = {
        code: code.trim(),
        scope,
        discount_type: type,
        discount_value: value,
        min_goods_vnd: minimum,
        ...(type === "PERCENT" ? { max_discount_vnd: cap } : {}),
        starts_at: new Date(start).toISOString(),
        ends_at: new Date(end).toISOString(),
        usage_limit: limit,
        per_customer_limit: perCustomer,
      };
      if (scope === "STORE")
        await callOperation("createStoreVoucher", { body });
      else await callOperation("createPlatformVoucher", { body });
      done();
    });
  };
  return (
    <form className="boot-card" onSubmit={submit}>
      <h2>Tạo ưu đãi</h2>
      <fieldset disabled={command.busy} className="market-form-grid">
        <label>
          Mã voucher
          <input
            required
            maxLength={50}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </label>
        <label>
          Loại giảm
          <select
            value={type}
            onChange={(e) => {
              const v = e.target.value as typeof type;
              setType(v);
              setValue(v === "PERCENT" ? 10 : 10000);
            }}
          >
            <option value="FIXED">Số tiền (VND)</option>
            <option value="PERCENT">Phần trăm (%)</option>
          </select>
        </label>
        <label>
          Mức giảm
          <input
            required
            type="number"
            min={1}
            max={type === "PERCENT" ? 100 : Number.MAX_SAFE_INTEGER}
            step={1}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
          />
        </label>
        <label>
          Đơn tối thiểu (VND)
          <input
            required
            type="number"
            min={0}
            max={Number.MAX_SAFE_INTEGER}
            step={1}
            value={minimum}
            onChange={(e) => setMinimum(Number(e.target.value))}
          />
        </label>
        {type === "PERCENT" && (
          <label>
            Giảm tối đa (VND)
            <input
              required
              type="number"
              min={1}
              max={Number.MAX_SAFE_INTEGER}
              step={1}
              value={cap}
              onChange={(e) => setCap(Number(e.target.value))}
            />
          </label>
        )}
        <label>
          Tổng lượt dùng
          <input
            required
            type="number"
            min={1}
            max={2147483647}
            step={1}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
        </label>
        <label>
          Lượt dùng mỗi khách
          <input
            required
            type="number"
            min={1}
            max={limit}
            step={1}
            value={perCustomer}
            onChange={(e) => setPerCustomer(Number(e.target.value))}
          />
        </label>
        <label>
          Bắt đầu
          <input
            required
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          Kết thúc
          <input
            required
            type="datetime-local"
            min={start}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
      </fieldset>
      {command.error != null && <ErrorView error={command.error} />}
      <button disabled={command.busy || end <= start || !code.trim()}>
        Tạo voucher
      </button>
      {command.error != null && (
        <p>
          Kiểm tra danh sách và mã voucher trước khi gửi lại nếu kết quả chưa
          rõ.
        </p>
      )}
    </form>
  );
}
