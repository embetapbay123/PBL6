import { AddressSuggestions } from "../../components/AddressSuggestions";
import { useConfirm } from "../../components/ConfirmDialog";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, isUncertainMutation } from "../../api/client";
import { callOperation } from "../../api/operations";
import { CustomerSubNav } from "./CustomerSubNav";
import { useAuth } from "../../api/auth-context";
import { checkoutAddressState } from "./checkout-intent";
import { useUnsavedChanges } from "../../components/useUnsavedChanges";
import { readAddressBook } from "./address-book";

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
  const returnTo =
    params.get("returnTo") === "/checkout" ? "/checkout" : undefined;
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
    const ok = await runMutation(() =>
      editing
        ? callOperation("updateAddress", { path: { id: editing }, body })
        : callOperation("createAddress", {
            body: {
              ...body,
              is_default: addresses.length === 0,
            },
          }),
    );
    if (mounted.current) {
      setAdding(false);
      // chỉ xóa form khi server nhận thành công
      if (ok) {
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

      <h1 className="text-2xl font-bold mb-6">Sổ địa chỉ</h1>
      {returnTo && (
        <Link className="ui-button ui-button-secondary" to={returnTo}>
          Quay lại thanh toán
        </Link>
      )}

      {actionError && (
        <div
          role="alert"
          className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg"
        >
          {actionError}
        </div>
      )}
      {uncertain && (
        <section role="region" aria-label="Đối chiếu thao tác địa chỉ">
          <h2>Kiểm tra kết quả lưu</h2>
          <p>
            {knownSaved
              ? "Server đã xác nhận thay đổi nhưng chưa đọc lại được danh sách."
              : "Kết nối bị gián đoạn khi lưu. Hãy kiểm tra danh sách trước khi thử thêm hoặc sửa lần nữa."}{" "}
            Chỉ đọc lại và kiểm tra địa chỉ bên dưới; không gửi lại thao tác cũ.
          </p>
          <button
            type="button"
            disabled={reading}
            onClick={() => void reconcile()}
          >
            Đọc lại sổ địa chỉ
          </button>
          {reconciled && (
            <>
              <p>
                Đã đọc danh sách hiện tại. Kiểm tra thông tin trước khi kết
                thúc; việc đọc lại không xác nhận ai đã tạo hoặc sửa một địa chỉ
                giống nhau.
              </p>
              <button
                type="button"
                onClick={() => {
                  releaseUnsaved();
                  setUncertain(false);
                  setKnownSaved(false);
                  setReconciled(false);
                  setActionError(null);
                  cancelEdit();
                }}
              >
                Đã đối chiếu, kết thúc thao tác này
              </button>
            </>
          )}
        </section>
      )}

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
          <label>
            Quận/huyện (theo địa chỉ được cung cấp)
            <input
              required
              maxLength={200}
              value={newDistrict}
              onChange={(e) => setNewDistrict(e.target.value)}
            />
          </label>
          <p className="form-hint">
            Giữ thông tin quận/huyện của địa chỉ giao nhận khi có; hệ thống hiện
            vẫn sử dụng trường này.
          </p>
          <button
            type="submit"
            disabled={adding}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {adding ? "Đang lưu..." : editing ? "Lưu địa chỉ" : "Thêm địa chỉ"}
          </button>
          {editing && (
            <button type="button" disabled={adding} onClick={cancelEdit}>
              Hủy sửa địa chỉ
            </button>
          )}
        </fieldset>
      </form>

      {/* Danh sách địa chỉ */}
      <div className="space-y-4">
        {addresses.length === 0 && (
          <p className="text-sm text-gray-600">
            Bạn chưa có địa chỉ nào. Hãy thêm địa chỉ nhận hàng ở form phía
            trên.
          </p>
        )}
        {addresses.map((addr) => {
          const busy = busyId === addr.id;
          return (
            <article
              aria-label={"Địa chỉ " + addr.name}
              key={addr.id}
              className="bg-white shadow rounded-lg p-6 flex justify-between items-start"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">{addr.name}</span>
                  <span className="text-gray-500 text-sm">({addr.phone})</span>
                  {addr.isDefault && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">
                      Mặc định
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mt-2">{addr.detail}</p>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                {returnTo && userId && !locked && (
                  <Link
                    to={returnTo}
                    state={checkoutAddressState(userId, addr.id)}
                  >
                    Giao đến địa chỉ này
                  </Link>
                )}
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => editAddress(addr)}
                >
                  Sửa địa chỉ
                </button>
                {!addr.isDefault && (
                  <button
                    type="button"
                    onClick={() => void handleSetDefault(addr.id)}
                    disabled={locked}
                    className="text-indigo-600 hover:underline text-right disabled:opacity-50"
                  >
                    {busy ? "Đang xử lý..." : "Thiết lập mặc định"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleDelete(addr.id)}
                  disabled={locked}
                  className="text-red-600 hover:underline text-right disabled:opacity-50"
                >
                  Xóa
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default AddressPage;
