import { Modal } from "../components/Modal";
import { useConfirm } from "../components/ConfirmDialog";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useUnsavedChanges } from "../components/useUnsavedChanges";
import { useQuery } from "@tanstack/react-query";
import { ApiError, isUncertainMutation } from "../api/client";
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
    .slice(0, 19);

async function readVoucher(
  scope: "STORE" | "PLATFORM",
  identity: { id?: string; code?: string },
): Promise<Voucher | undefined> {
  // A saved start date can move the voucher to another page. Read from the beginning.
  for (let page = 1; page <= 100; page++) {
    const input = { query: { page, size: 100 } },
      result =
        scope === "STORE"
          ? await callOperation("listStoreVouchers", input)
          : await callOperation("listPlatformVouchers", input);
    const found = result.items.find((v) =>
      identity.id
        ? v.id === identity.id
        : v.code.toUpperCase() === identity.code?.toUpperCase(),
    );
    if (found) return found;
    if (result.page * result.size >= result.total) return undefined;
    if (!result.items.length)
      throw new ApiError(
        503,
        "VOUCHER_READBACK_INCOMPLETE",
        "Danh sách thay đổi trong khi đọc. Đọc lại trước khi thao tác tiếp.",
      );
  }
  throw new ApiError(
    503,
    "VOUCHER_READBACK_LIMIT",
    "Chưa đọc hết danh sách voucher. Chưa thể kết luận kết quả; giữ nguyên yêu cầu để đối chiếu.",
  );
}

/** Store is derived by the server from the authenticated membership, never from an editable ID. */
export function VoucherPanel({ scope }: { scope: "STORE" | "PLATFORM" }) {
  const { confirm, dialog } = useConfirm();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Voucher>();
  const [statusReview, setStatusReview] = useState<{
    id: string;
    code: string;
    requested: "ACTIVE" | "STOPPED";
  }>();
  const [usage, setUsage] = useState<{
    code: string;
    value: OperationOutputs["getStoreVoucherUsage"];
  }>();
  const command = useCommand();
  const formCommand = useCommand();
  const [formReview, setFormReview] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const discardDraft = async () =>
    !formDirty ||
    (await confirm({
      title: "Bỏ thay đổi voucher?",
      description:
        "Các thay đổi chưa lưu sẽ bị mất. Voucher đã lưu vẫn giữ nguyên.",
      confirmLabel: "Bỏ bản nháp",
    }));
  const closeForm = async () => {
    if (controlsLocked || !(await discardDraft())) return;
    setShowForm(false);
    setEditing(undefined);
  };
  const controlsLocked = command.busy || formCommand.busy || formReview;
  const list = useQuery({
    queryKey: ["vouchers", scope, page],
    queryFn: () =>
      scope === "STORE"
        ? callOperation("listStoreVouchers", { query: { page, size: 20 } })
        : callOperation("listPlatformVouchers", { query: { page, size: 20 } }),
  });

  const changeStatus = (voucher: Voucher, status: "ACTIVE" | "STOPPED") => {
    if (
      controlsLocked ||
      !voucher.id ||
      voucher.version === undefined ||
      statusReview?.id === voucher.id ||
      (showForm && editing?.id === voucher.id)
    )
      return;
    void command.run(async () => {
      setUsage(undefined);
      try {
        const input = {
          path: { id: voucher.id! },
          body: {
            status,
            expected_version: voucher.version!,
          },
        };
        if (scope === "STORE") await callOperation("updateStoreVoucher", input);
        else await callOperation("updatePlatformVoucher", input);
        command.setNotice(
          (status === "STOPPED" ? "Đã dừng voucher " : "Đã mở lại voucher ") +
            voucher.code +
            ". Đơn đã chốt giữ nguyên ưu đãi.",
        );
      } catch (error) {
        if (
          isUncertainMutation(error) ||
          (error instanceof ApiError && error.status === 409)
        )
          setStatusReview({
            id: voucher.id!,
            code: voucher.code,
            requested: status,
          });
        throw error;
      } finally {
        // A conflict or uncertain response requires a fresh version before another attempt.
        await list.refetch();
      }
    });
  };
  const readStatus = () =>
    void command.run(async () => {
      if (!statusReview) return;
      const current = await readVoucher(scope, { id: statusReview.id });
      if (!current || current.version === undefined)
        throw new ApiError(
          409,
          "VOUCHER_READBACK_REQUIRED",
          "Chưa tìm thấy phiên bản voucher ở trang này. Quay lại trang có mã voucher rồi đọc lại; chưa gửi quyết định mới.",
        );
      command.setNotice(
        "Đã đọc lại " +
          current.code +
          ": " +
          (current.status === "ACTIVE" ? "đang mở" : "đang dừng") +
          ". " +
          (current.status === statusReview.requested
            ? "Trạng thái đã đạt yêu cầu."
            : "Trạng thái hiện tại chưa phải yêu cầu trước; hãy kiểm tra trước khi chọn lại thao tác.") +
          " Không tự gửi lại lệnh.",
      );
      setStatusReview(undefined);
      await list.refetch();
    });
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
      {dialog}
      <h1>{scope === "STORE" ? "Voucher gian hàng" : "Voucher toàn sàn"}</h1>
      <p className="text-slate-500">
        Theo dõi ưu đãi, giới hạn sử dụng và số lượt đã áp dụng.
      </p>
      <button
        disabled={controlsLocked || !!statusReview}
        onClick={async () => {
          if (!(await discardDraft())) return;
          formCommand.setError(undefined);
          formCommand.setNotice("");
          setEditing(undefined);
          setShowForm((v) => !v);
        }}
      >
        {showForm
          ? editing
            ? "Đóng form sửa"
            : "Đóng form tạo"
          : "Tạo voucher mới"}
      </button>
      {showForm && (
        <Modal
          variant="dialog"
          label={editing ? "Sửa voucher" : "Tạo voucher mới"}
          busy={controlsLocked}
          onClose={() => void closeForm()}
        >
          <div className="voucher-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>{editing ? "Sửa voucher" : "Tạo voucher mới"}</h2>
            <button
              type="button"
              className="ui-button ui-button-secondary"
              disabled={controlsLocked}
              onClick={() => void closeForm()}
            >
              Đóng và quay lại danh sách
            </button>
          </div>
          <CreateVoucher
            key={editing?.id ?? "create"}
            scope={scope}
            initial={editing}
            command={formCommand}
            onReview={setFormReview}
            onDirty={setFormDirty}
            reloadInitial={() => readVoucher(scope, { id: editing?.id })}
            done={(notice) => {
              setFormReview(false);
              setUsage(undefined);
              command.setNotice(notice);
              setShowForm(false);
              setEditing(undefined);
              void list.refetch();
            }}
          />
        </Modal>
      )}
      {command.error != null && <ErrorView error={command.error} />}
      {command.notice && <p role="status">{command.notice}</p>}
      {statusReview && (
        <section className="boot-card" aria-label="Kiểm tra quyết định voucher">
          <h2>Cần đọc lại voucher {statusReview.code}</h2>
          <p>
            Quyết định trước bị xung đột hoặc chưa rõ kết quả. Tạm khóa sửa và
            đổi trạng thái mã này để tránh gửi tiếp từ phiên bản cũ.
          </p>
          <button
            type="button"
            disabled={command.busy || list.isFetching}
            onClick={readStatus}
          >
            Đọc lại trạng thái voucher
          </button>
        </section>
      )}
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
                      {v.discount_type === "PERCENT" &&
                        v.max_discount_vnd != null && (
                          <p>Tối đa {formatMoney(v.max_discount_vnd)}</p>
                        )}
                    </td>
                    <td className="voucher-conditions">
                      <strong>Đơn từ {formatMoney(v.min_goods_vnd ?? 0)}</strong>
                      <span>{v.usage_limit} lượt · {v.per_customer_limit}/khách</span>
                      {v.usage_summary && <small>Còn {v.usage_summary.remaining_count} lượt · đã dùng {v.usage_summary.redeemed_count} · đang giữ {v.usage_summary.reserved_count}</small>}
                    </td>
                    <td>
                      {new Date(v.starts_at).toLocaleString("vi-VN")}
                      <p>đến {new Date(v.ends_at).toLocaleString("vi-VN")}</p>
                    </td>
                    <td>
                      <span className={'seller-status '+(v.status==='ACTIVE'?'is-active':'is-inactive')}>{v.status==='ACTIVE'?'Đang hoạt động':v.status==='STOPPED'?'Đã dừng':'Chưa rõ trạng thái'}</span>
                    </td>
                    <td>
                      <div className="voucher-table-actions">
                        <button
                          type="button"
                          className="voucher-action-btn"
                          disabled={controlsLocked || !v.id}
                          onClick={() => showUsage(v)}
                        >
                          Xem lượt dùng
                        </button>
                        <button
                          type="button"
                          className="voucher-action-btn"
                          disabled={controlsLocked || !v.id || !!statusReview}
                          onClick={async () => {
                            if (showForm && editing?.id === v.id) return;
                            if (!(await discardDraft())) return;
                            formCommand.setError(undefined);
                            formCommand.setNotice("");
                            setEditing(v);
                            setShowForm(true);
                          }}
                        >
                          Sửa voucher
                        </button>
                        {v.status === "STOPPED" && (
                          <button
                            type="button"
                            className="voucher-action-btn voucher-btn-activate"
                            disabled={
                              controlsLocked ||
                              list.isFetching ||
                              !v.id ||
                              v.version === undefined ||
                              statusReview?.id === v.id ||
                              (showForm && editing?.id === v.id)
                            }
                            onClick={() => changeStatus(v, "ACTIVE")}
                          >
                            Mở lại voucher
                          </button>
                        )}
                        {v.status === "ACTIVE" && (
                          <button
                            type="button"
                            className="voucher-action-btn voucher-btn-stop"
                            disabled={
                              controlsLocked ||
                              list.isFetching ||
                              !v.id ||
                              v.version === undefined ||
                              statusReview?.id === v.id ||
                              (showForm && editing?.id === v.id)
                            }
                            onClick={() => changeStatus(v, "STOPPED")}
                          >
                            Dừng voucher
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!list.data.items.length && <p>Chưa có voucher ở trang này.</p>}
          </div>
          <fieldset disabled={controlsLocked || list.isFetching}>
            <legend>Trang voucher</legend>
            <Pagination
              page={page}
              size={list.data.size}
              total={list.data.total}
              onPage={setPage}
            />
          </fieldset>
        </>
      )}
    </section>
  );
}

function CreateVoucher({
  scope,
  done,
  initial,
  reloadInitial,
  command,
  onReview,
  onDirty,
}: {
  initial?: Voucher;
  reloadInitial: () => Promise<Voucher | undefined>;
  scope: "STORE" | "PLATFORM";
  done: (notice: string) => void;
  command: ReturnType<typeof useCommand>;
  onReview: (value: boolean) => void;
  onDirty: (value: boolean) => void;
}) {
  const submitted = useRef<
    OperationInputs["createStoreVoucher"]["body"] | undefined
  >(undefined);
  const [code, setCode] = useState(initial?.code ?? ""),
    [type, setType] = useState<"FIXED" | "PERCENT">(
      initial?.discount_type ?? "FIXED",
    );
  const [value, setValue] = useState(initial?.discount_value ?? 10000),
    [minimum, setMinimum] = useState(initial?.min_goods_vnd ?? 50000),
    [cap, setCap] = useState(initial?.max_discount_vnd ?? 50000);
  const [capped, setCapped] = useState(
      initial ? initial.max_discount_vnd != null : true,
    ),
    [notFound, setNotFound] = useState(false);
  const [limit, setLimit] = useState(initial?.usage_limit ?? 100),
    [perCustomer, setPerCustomer] = useState(initial?.per_customer_limit ?? 1);
  const [start, setStart] = useState(() =>
    localDateTime(initial ? new Date(initial.starts_at) : new Date()),
  );
  const [end, setEnd] = useState(() =>
    localDateTime(
      initial
        ? new Date(initial.ends_at)
        : new Date(Date.now() + 30 * 86400000),
    ),
  );
  const [exampleGoods, setExampleGoods] = useState(200000);
  const previewValid =
    Number.isSafeInteger(exampleGoods) &&
    exampleGoods >= 0 &&
    exampleGoods <= 1000000000 &&
    Number.isFinite(value) &&
    value >= 0 &&
    (type !== "PERCENT" || value <= 100);
  const estimatedDiscount =
    previewValid && exampleGoods >= minimum
      ? Math.min(
          exampleGoods,
          type === "PERCENT"
            ? Math.min(
                Math.floor((exampleGoods * value) / 100),
                capped ? cap : Infinity,
              )
            : value,
        )
      : 0;
  const [blocked, setBlocked] = useState(false),
    [version, setVersion] = useState(initial?.version),
    [server, setServer] = useState<Voucher>(),
    [message, setMessage] = useState("");
  const fields = JSON.stringify({
      code,
      type,
      value,
      minimum,
      cap,
      capped,
      limit,
      perCustomer,
      start,
      end,
    }),
    original = useRef(fields),
    dirty = fields !== original.current;
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  const release = useUnsavedChanges(dirty || command.busy || blocked);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (blocked) return;
    void command.run(async () => {
      const body: OperationInputs["createStoreVoucher"]["body"] = {
        code: code.trim(),
        scope,
        discount_type: type,
        discount_value: value,
        min_goods_vnd: minimum,
        ...(type === "PERCENT" && capped ? { max_discount_vnd: cap } : {}),
        starts_at:
          initial && start === localDateTime(new Date(initial.starts_at))
            ? new Date(initial.starts_at).toISOString()
            : new Date(start).toISOString(),
        ends_at:
          initial && end === localDateTime(new Date(initial.ends_at))
            ? new Date(initial.ends_at).toISOString()
            : new Date(end).toISOString(),
        usage_limit: limit,
        per_customer_limit: perCustomer,
      };
      submitted.current = body;
      try {
        if (initial?.id) {
          const { code: _code, scope: _scope, ...changes } = body;
          const input = {
            path: { id: initial.id },
            body: {
              ...changes,
              max_discount_vnd: type === "PERCENT" && capped ? cap : null,
              expected_version: version!,
            },
          };
          if (scope === "STORE")
            await callOperation("updateStoreVoucher", input);
          else await callOperation("updatePlatformVoucher", input);
        } else if (scope === "STORE")
          await callOperation("createStoreVoucher", { body });
        else await callOperation("createPlatformVoucher", { body });
        release();
        done(
          (initial ? "Đã cập nhật voucher " : "Đã tạo voucher ") +
            body.code +
            ". Đơn đã chốt giữ nguyên ưu đãi.",
        );
      } catch (error) {
        if (
          isUncertainMutation(error) ||
          (!!initial && error instanceof ApiError && error.status === 409)
        ) {
          setBlocked(true);
          onReview(true);
        }
        throw error;
      }
    });
  };
  return (
    <form className="boot-card voucher-modal-form" onSubmit={submit}>
      <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13px' }}>
        Đơn đã chốt giữ nguyên snapshot ưu đãi. Lượt đã dùng không được phục hồi
        sau hủy / hoàn; lượt giữ chưa tạo đơn được nhả.
      </p>
      <div className="voucher-modal-body-layout">
        <aside className="voucher-preview">
          <div className="seller-voucher-card" aria-label="Xem trước voucher">
            <span>{scope === 'STORE' ? 'Ưu đãi từ gian hàng' : 'Ưu đãi từ sàn'}</span>
            <strong>{type === 'PERCENT' ? `${value || 0}%` : formatMoney(value || 0)}</strong>
            <span>Mã: {code.trim() || 'Chưa nhập mã'}</span>
            <small>Đơn từ {formatMoney(minimum || 0)}{type === 'PERCENT' && capped ? ` · Giảm tối đa ${formatMoney(cap || 0)}` : ''}</small>
          </div>
          <h3>Thử mức giảm</h3>
          <label>
            Tiền hàng ví dụ (VND)
            <input
              type="number"
              min={0}
              max={1000000000}
              step={1}
              value={exampleGoods}
              onChange={(e) => setExampleGoods(Number(e.target.value))}
            />
          </label>
          <p role="status">
            {!previewValid
              ? "Nhập số nguyên từ 0 đến 1 tỷ đồng để xem ví dụ."
              : exampleGoods < minimum
                ? "Ví dụ này chưa đạt tiền hàng tối thiểu."
                : "Ước tính giảm " +
                  formatMoney(estimatedDiscount) +
                  "; tiền hàng còn " +
                  formatMoney(exampleGoods - estimatedDiscount) +
                  "."}
          </p>
          <small>
            Chỉ minh họa riêng mã này; chưa gồm phí giao hàng, mã khác, thời hạn
            và hạn mức. Tổng thực tế do checkout kiểm tra.
          </small>
        </aside>
        <div className="voucher-fields-container">
          <fieldset disabled={command.busy || blocked} className="market-form-grid">
        <label>
          Mã voucher
          <input
            required
            readOnly={!!initial}
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
            <input
              type="checkbox"
              checked={capped}
              onChange={(e) => setCapped(e.target.checked)}
            />
            Giới hạn số tiền giảm tối đa
          </label>
        )}
        {type === "PERCENT" && capped && (
          <label>
            Giảm tối đa (VND)
            <input
              required
              type="number"
              min={0}
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
            step={1}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          Kết thúc
          <input
            required
            type="datetime-local"
            step={1}
            min={start}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
      </fieldset>
      </div>
      </div>
      {command.error != null && <ErrorView error={command.error} />}
      <div className="voucher-form-submit-row" style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          className="ui-button ui-button-primary"
          disabled={command.busy || blocked || end <= start || !code.trim()}
        >
          {initial ? "Lưu voucher" : "Tạo voucher"}
        </button>
      </div>
      {blocked && initial && (
        <button
          type="button"
          disabled={command.busy}
          onClick={() =>
            void command.run(async () => {
              const fresh = await reloadInitial();
              if (!fresh || fresh.version === undefined)
                throw new Error(
                  "Chưa tìm được phiên bản voucher để đối chiếu. Chưa gửi thay đổi mới.",
                );
              setVersion(fresh.version);
              setServer(fresh);
              setBlocked(false);
              onReview(false);
              setMessage(
                "Đã đọc phiên bản mới. Giữ bản nháp; so sánh dữ liệu server bên dưới trước khi bấm lưu.",
              );
            })
          }
        >
          Đọc lại voucher trước khi sửa tiếp
        </button>
      )}
      {blocked && !initial && (
        <button
          type="button"
          disabled={command.busy}
          onClick={() =>
            void command.run(async () => {
              const fresh = await readVoucher(scope, {
                code: submitted.current?.code,
              });
              setServer(fresh);
              setNotFound(!fresh);
              setMessage(
                fresh
                  ? "Đã tìm thấy mã voucher trong phạm vi hiện tại. Đối chiếu dữ liệu server; đây không phải lần tạo mới."
                  : "Chưa tìm thấy mã voucher. Điều này chưa khẳng định lệnh cũ không được ghi; chỉ gửi lại đúng dữ liệu và mã ban đầu nếu muốn thử lại.",
              );
            })
          }
        >
          Đọc lại kết quả tạo voucher
        </button>
      )}
      {blocked && !initial && server && (
        <button
          type="button"
          disabled={command.busy}
          onClick={() => {
            release();
            done(
              "Đã đối chiếu voucher " +
                server.code +
                " trên server; không gửi lại lệnh tạo.",
            );
          }}
        >
          Đã đối chiếu, về danh sách
        </button>
      )}
      {blocked && !initial && notFound && (
        <button
          type="button"
          disabled={command.busy}
          onClick={() =>
            void command.run(async () => {
              const body = submitted.current;
              if (!body) return;
              setNotFound(false);
              try {
                if (scope === "STORE")
                  await callOperation("createStoreVoucher", { body });
                else await callOperation("createPlatformVoucher", { body });
                release();
                done("Đã tạo voucher " + body.code + " bằng dữ liệu ban đầu.");
              } catch (error) {
                setMessage(
                  "Chưa xác định được kết quả gửi lại. Đọc lại mã voucher trước khi thao tác tiếp.",
                );
                throw error;
              }
            })
          }
        >
          Gửi lại đúng dữ liệu và mã ban đầu
        </button>
      )}
      {server && (
        <div>
          <h3>Bản hiện tại trên server</h3>
          <p>
            {server.code} ·{" "}
            {server.discount_type === "PERCENT"
              ? server.discount_value + "%"
              : formatMoney(server.discount_value)}{" "}
            · Đơn từ {formatMoney(server.min_goods_vnd ?? 0)} ·{" "}
            {server.discount_type !== "PERCENT"
              ? "Giảm số tiền cố định"
              : server.max_discount_vnd == null
                ? "Không giới hạn số tiền giảm"
                : "Tối đa " + formatMoney(server.max_discount_vnd)}{" "}
            · {server.usage_limit} lượt / {server.per_customer_limit} mỗi khách
          </p>
          <p>
            {new Date(server.starts_at).toLocaleString("vi-VN")} →{" "}
            {new Date(server.ends_at).toLocaleString("vi-VN")} · {server.status}
          </p>
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {command.error != null && (
        <p>
          Kiểm tra danh sách và mã voucher trước khi gửi lại nếu kết quả chưa
          rõ.
        </p>
      )}
    </form>
  );
}
