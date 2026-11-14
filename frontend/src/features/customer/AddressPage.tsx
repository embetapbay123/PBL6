import { AddressSuggestions } from "../../components/AddressSuggestions";
import { Button as UiButton } from "../../components/ui/Button";
import { useConfirm } from "../../components/ConfirmDialog";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, isUncertainMutation } from "../../api/client";
import { callOperation } from "../../api/operations";
import { CustomerSubNav } from "./CustomerSubNav";
import { useAuth } from "../../api/auth-context";
import { checkoutAddressState, ownsCheckoutState } from "./checkout-intent";
import { useUnsavedChanges } from "../../components/useUnsavedChanges";
import { readAddressBook } from "./address-book";
import { Plus } from "lucide-react";

interface ApiAddress {
  id: string;
  recipient_name: string;
  phone: string;
  line1: string;
  ward: string;
  district: string;
  city: string;
  is_default?: boolean;
}

interface Address {
  source: ApiAddress;
  id: string;
  name: string;
  phone: string;
  detail: string;
  isDefault: boolean;
}

const fromApi = (a: ApiAddress): Address => ({
  source: a,
  id: a.id,
  name: a.recipient_name,
  phone: a.phone,
  detail: [a.line1, a.ward, a.district, a.city].filter(Boolean).join(", "),
  isDefault: Boolean(a.is_default),
});

const describeError = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    }
    return error.message || "Không thể xử lý yêu cầu. Vui lòng thử lại.";
  }
  return "Không thể kết nối tới máy chủ. Vui lòng thử lại.";
};

export const AddressPage: React.FC = () => {
  const { confirm, dialog } = useConfirm();
  const { session } = useAuth(),
    userId = session?.context?.user_id;
  const [params] = useSearchParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const returnTo =
    params.get("returnTo") === "/checkout" ? "/checkout" : undefined;
  const addingForCheckout = !!returnTo && params.get("add") === "1";
  const checkoutSelection = ownsCheckoutState(userId, state) ? state : undefined;
  const returnState = (addressId?: string) => addressId && userId
    ? { ...checkoutSelection, ...checkoutAddressState(userId, addressId) }
    : checkoutSelection;
  const [editorOpen, setEditorOpen] = useState(addingForCheckout);
  const [editing, setEditing] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false),
    [knownSaved, setKnownSaved] = useState(false),
    [reconciled, setReconciled] = useState(false),
    [reading, setReading] = useState(false);
  const flight = useRef(false);
  const locked = adding || busyId !== null || uncertain;

  const [newLine1, setNewLine1] = useState("");
  const [newWard, setNewWard] = useState("");
  const [newDistrict, setNewDistrict] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const original = addresses.find((a) => a.id === editing)?.source;
  const values = [newName, newPhone, newLine1, newWard, newDistrict, newCity];
  const dirty = editing
    ? JSON.stringify(values) !==
      JSON.stringify(
        original
          ? [
              original.recipient_name,
              original.phone,
              original.line1,
              original.ward,
              original.district,
              original.city,
            ]
          : [],
      )
    : values.some(Boolean);
  const releaseUnsaved = useUnsavedChanges(
    dirty || uncertain || adding || busyId !== null,
  );

  useEffect(() => {
    if (!editorOpen || loading || loadError) return;
    const frame = requestAnimationFrame(() => {
      form.current?.scrollIntoView({ block: "nearest" });
      form.current?.querySelector("input")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [editorOpen, editing, loading, loadError]);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchAddresses = useCallback(async () => {
    const rows = await readAddressBook();
    if (mounted.current) setAddresses(rows.map(fromApi));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      await fetchAddresses();
    } catch (error) {
      if (mounted.current) setLoadError(describeError(error));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [fetchAddresses]);

  useEffect(() => {
    void load();
  }, [load]);

  const runMutation = async (
    mutate: () => Promise<unknown>,
    refresh = true,
  ): Promise<boolean> => {
    setActionError(null);
    try {
      await mutate();
    } catch (error) {
      if (mounted.current) {
        setActionError(describeError(error));
        if (isUncertainMutation(error)) {
          setUncertain(true);
          setKnownSaved(false);
          setReconciled(false);
        }
      }
      flight.current = false;
      return false;
    }
    if (!refresh) {
      flight.current = false;
      return true;
    }
    try {
      await fetchAddresses();
    } catch (error) {
      if (mounted.current) {
        setActionError(
          "Đã lưu nhưng không thể tải lại danh sách. " + describeError(error),
        );
        setUncertain(true);
        setKnownSaved(true);
        setReconciled(false);
      }
      flight.current = false;
      return false;
    }
    flight.current = false;
    return true;
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const phone = newPhone.trim();
    const line1 = newLine1.trim();
    const ward = newWard.trim();
    const district = newDistrict.trim();
    const city = newCity.trim();
    if (
      !line1 ||
      !ward ||
      !district ||
      !city ||
      !name ||
      !phone ||
      locked ||
      flight.current
    )
      return;

    flight.current = true;
    setAdding(true);
    const body = { recipient_name: name, phone, line1, ward, district, city };
    let newAddressId: string | undefined;
    const resumeCheckout = addingForCheckout && !editing;
    const ok = await runMutation(async () => {
      if (editing) await callOperation("updateAddress", { path: { id: editing }, body });
      else {
        const result = await callOperation("createAddress", {
          body: { ...body, is_default: addresses.length === 0 },
        });
        newAddressId = result.id;
      }
    }, !resumeCheckout);
    if (mounted.current) {
      setAdding(false);
      // chỉ xóa form khi server nhận thành công
      if (ok) {
        if (resumeCheckout) {
          releaseUnsaved();
          navigate("/checkout", { replace: true, state: returnState(newAddressId) });
          return;
        }
        setEditorOpen(false);
        setEditing(null);
        setNewName("");
        setNewPhone("");
        setNewLine1("");
        setNewWard("");
        setNewDistrict("");
        setNewCity("");
      }
    }
  };
  const editAddress = (addr: Address) => {
    if (locked || flight.current) return;
    setEditorOpen(true);
    setEditing(addr.id);
    setNewName(addr.source.recipient_name);
    setNewPhone(addr.source.phone);
    setNewLine1(addr.source.line1);
    setNewWard(addr.source.ward);
    setNewDistrict(addr.source.district);
    setNewCity(addr.source.city);
    setActionError(null);
    form.current?.scrollIntoView({ block: "start" });
    form.current?.querySelector("input")?.focus();
  };
  const cancelEdit = () => {
    setEditorOpen(false);
    setEditing(null);
    setNewName("");
    setNewPhone("");
    setNewLine1("");
    setNewWard("");
    setNewDistrict("");
    setNewCity("");
  };

  const handleSetDefault = async (id: string) => {
    if (locked || flight.current) return;
    flight.current = true;
    setBusyId(id);
    await runMutation(() =>
      callOperation("updateAddress", {
        path: { id },
        body: { is_default: true },
      }),
    );
    if (mounted.current) setBusyId(null);
  };

  const handleDelete = async (id: string) => {
    if (locked || flight.current) return;
    const address = addresses.find((a) => a.id === id);
    if (
      !(await confirm({
        title: "Xóa địa chỉ?",
        description: `${address?.name ?? ""} — ${address?.detail ?? ""}. Địa chỉ này sẽ không còn dùng cho các lần đặt mới; địa chỉ đã chốt trong đơn cũ được giữ nguyên.`,
        confirmLabel: "Xóa địa chỉ",
      }))
    )
      return;
    if (locked || flight.current) return;
    flight.current = true;
    setBusyId(id);
    await runMutation(() => callOperation("deleteAddress", { path: { id } }));
    if (mounted.current) setBusyId(null);
  };
  const reconcile = async () => {
    if (flight.current) return;
    flight.current = true;
    setReading(true);
    setActionError(null);
    setReconciled(false);
    try {
      await fetchAddresses();
      if (mounted.current) setReconciled(true);
    } catch (error) {
      if (mounted.current) setActionError(describeError(error));
    } finally {
      flight.current = false;
      if (mounted.current) setReading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl" role="status">
        <p className="text-sm text-gray-600">Đang tải sổ địa chỉ...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div
          role="alert"
          className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg"
        >
          {loadError}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <CustomerSubNav />
      {dialog}

      <div className="address-page-header flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 m-0">Địa chỉ của tôi</h1>
          <p className="text-xs text-slate-500 mt-1">Quản lý địa chỉ nhận hàng để trải nghiệm mua sắm nhanh chóng</p>
        </div>
        <div className="flex items-center gap-2">
          {returnTo && (
            <Link className="ui-button ui-button-secondary text-xs" to={returnTo} state={returnState()}>
              Quay lại thanh toán
            </Link>
          )}
          {!editorOpen && (
            <button
              className="ui-button ui-button-primary order-btn-highlight text-xs flex items-center gap-1.5"
              type="button"
              onClick={() => {
                cancelEdit();
                setEditorOpen(true);
              }}
            >
              <Plus size={15} />
              <span>Thêm địa chỉ mới</span>
            </button>
          )}
        </div>
      </div>
      {editorOpen && (
        <>
          {/* Form thêm địa chỉ mới */}
          <form
            ref={form}
            onSubmit={handleAddAddress}
            className="bg-white shadow rounded-lg p-6 mb-8 space-y-4"
          >
            <fieldset disabled={locked} className="space-y-4">
              <h2 className="text-lg font-semibold mb-2">
                {editing ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="addr-name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Tên người nhận
                  </label>
                  <input
                    id="addr-name"
                    type="text"
                    maxLength={200}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full border rounded-md p-2"
                    placeholder="Nguyễn Văn A"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="addr-phone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Số điện thoại
                  </label>
                  <input
                    id="addr-phone"
                    type="tel"
                    autoComplete="tel"
                    maxLength={20}
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full border rounded-md p-2"
                    placeholder="090XXXXXXX"
                    required
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="addr-line1"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Số nhà, tên đường
                </label>
                <input
                  id="addr-line1"
                  type="text"
                  maxLength={200}
                  value={newLine1}
                  onChange={(e) => setNewLine1(e.target.value)}
                  className="w-full border rounded-md p-2"
                  placeholder="123 Đường ABC"
                  required
                />
              </div>
              <AddressSuggestions
                city={newCity}
                ward={newWard}
                onCity={setNewCity}
                onWard={setNewWard}
              />
              <div>
                <label
                  htmlFor="addr-district"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Quận / huyện
                </label>
                <input
                  id="addr-district"
                  required
                  maxLength={200}
                  value={newDistrict}
                  onChange={(e) => setNewDistrict(e.target.value)}
                  className="w-full border rounded-md p-2"
                  placeholder="Quận / Huyện"
                />
              </div>
              <div className="ui-actions flex items-center gap-2 mt-4">
                <UiButton
                  type="submit"
                  disabled={adding}
                  loading={adding}
                >
                  {adding
                    ? "Đang lưu..."
                    : editing
                      ? "Lưu địa chỉ"
                      : "Thêm địa chỉ"}
                </UiButton>
                {editorOpen && (
                  <UiButton
                    type="button"
                    variant="secondary"
                    disabled={adding}
                    onClick={cancelEdit}
                  >
                    {editing ? "Hủy" : "Hủy"}
                  </UiButton>
                )}
              </div>
            </fieldset>
          </form>
        </>
      )}
      {/* Danh sách địa chỉ chuẩn Shopee */}
      <div className="shopee-address-list space-y-3">
        {addresses.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <p className="text-sm text-slate-500">
              Bạn chưa có địa chỉ nhận hàng nào. Bấm &quot;Thêm địa chỉ mới&quot; để thiết lập.
            </p>
          </div>
        )}
        {addresses.map((addr) => {
          const busy = busyId === addr.id;
          return (
            <article
              aria-label={"Địa chỉ " + addr.name}
              key={addr.id}
              className={
                "shopee-address-card" + (addr.isDefault ? " is-default" : "")
              }
            >
              <div className="shopee-address-main">
                <div className="shopee-address-user-line">
                  <span className="shopee-address-name">{addr.name}</span>
                  <span className="shopee-address-divider" aria-hidden="true">|</span>
                  <span className="shopee-address-phone">{addr.phone}</span>
                </div>
                <p className="shopee-address-detail">{addr.detail}</p>
              </div>
              <div className="shopee-address-side-actions">
                <div className="shopee-address-text-actions">
                  <button
                    type="button"
                    className="shopee-text-action-btn"
                    disabled={locked}
                    onClick={() => editAddress(addr)}
                  >
                    Cập nhật
                  </button>
                  {!addr.isDefault && (
                    <button
                      type="button"
                      className="shopee-text-action-btn is-delete"
                      disabled={locked}
                      onClick={() => void handleDelete(addr.id)}
                    >
                      Xóa
                    </button>
                  )}
                </div>
                <div className="shopee-address-btn-actions">
                  {addr.isDefault && <span className="shopee-default-badge">Mặc định</span>}
                  {returnTo && userId && !locked && (
                    <Link
                      to={returnTo}
                      state={returnState(addr.id)}
                      className="ui-button ui-button-primary order-btn-highlight text-xs"
                    >
                      Giao đến địa chỉ này
                    </Link>
                  )}
                  {!addr.isDefault ? (
                    <button
                      type="button"
                      onClick={() => void handleSetDefault(addr.id)}
                      disabled={locked}
                      className="shopee-set-default-btn"
                    >
                      {busy ? "Đang xử lý..." : "Thiết lập mặc định"}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default AddressPage;
