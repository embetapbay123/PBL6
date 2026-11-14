import { Button as UiButton } from "../../components/ui/Button";
import { VoucherPicker } from "./VoucherPicker";
import { CheckCircle2 } from "lucide-react";
import { paymentMethodLabel } from "../../components/OrderListTools";
import {
  ReturnPolicyNotice,
  orderStatusLabel,
} from "../../components/OrderPresentation";
import { StoreLabel } from "../../live/StoreLabel";
import { PurchaseActionBar } from "../../components/PurchaseActionBar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ApiError, request } from "../../api/client";
import { callOperation } from "../../api/operations";
import { useAuth } from "../../api/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  readBuyNow,
  isBuyNow,
  clearBuyNow,
  ownsCheckoutState,
  checkoutState,
  readCheckoutAddress,
  type BuyNowSelection,
} from "./checkout-intent";
import type {
  OperationInputs,
  OperationOutputs,
} from "../../api/operations.generated";
import { CartProduct } from "../../live/CartProduct";
import { readAddressBook } from "./address-book";

interface CartItem {
  id: string;
  variant_id: string;
  product_id: string;
  store_id: string;
  quantity: number;
}

interface CartList {
  items: CartItem[];
  page: number;
  size: number;
  total: number;
}

interface Address {
  id: string;
  recipient_name: string;
  phone: string;
  line1: string;
  ward: string;
  district: string;
  city: string;
  is_default?: boolean;
}

interface Quote {
  quote_id: string;
  payable_total_vnd: number;
  expires_at: string;
  stores?: OperationOutputs["quoteCheckout"]["stores"];
}

type ConfirmPayload = OperationInputs["confirmCheckout"]["body"];

interface Attempt {
  quote: Quote;
  payload: ConfirmPayload;
  key: string;
  items: CartItem[];
  addressLabel: string;
  userId?: string;
}
interface CheckoutDraft {
  addressId: string;
  methods: Record<string, "COD" | "SANDBOX">;
  voucherDraft: Record<string, string>;
  platformDraft: string;
  vouchers: Pick<ConfirmPayload, "platform_voucher_code" | "store_vouchers">;
}
const stringMap = (value: unknown): Record<string, string> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(
        Object.entries(value).filter(
          ([k, v]) =>
            /^[a-f0-9-]{36}$/i.test(k) &&
            typeof v === "string" &&
            v.length <= 200,
        ),
      )
    : {};
function readDraft(
  userId: string | undefined,
  source: string,
): CheckoutDraft | undefined {
  if (!userId) return;
  try {
    const d = JSON.parse(
      sessionStorage.getItem("pbl6_checkout_draft_" + userId) ?? "null",
    );
    if (
      !d ||
      d.source !== source ||
      !Number.isFinite(d.savedAt) ||
      Date.now() - d.savedAt > 30 * 60 * 1000
    )
      return;
    return {
      addressId: typeof d.addressId === "string" ? d.addressId : "",
      methods: Object.fromEntries(
        Object.entries(stringMap(d.methods)).filter(
          ([, v]) => v === "COD" || v === "SANDBOX",
        ),
      ) as CheckoutDraft["methods"],
      voucherDraft: stringMap(d.voucherDraft),
      platformDraft:
        typeof d.platformDraft === "string"
          ? d.platformDraft.slice(0, 200)
          : "",
      vouchers: {
        ...(typeof d.vouchers?.platform_voucher_code === "string"
          ? {
              platform_voucher_code: d.vouchers.platform_voucher_code.slice(
                0,
                200,
              ),
            }
          : {}),
        ...(d.vouchers?.store_vouchers
          ? { store_vouchers: stringMap(d.vouchers.store_vouchers) }
          : {}),
      },
    };
  } catch {
    return;
  }
}

const PAGE_SIZE = 100;
const MAX_PAGES = 200;

const getAttemptKey = (userId?: string) =>
  userId ? `pbl6_checkout_attempt_${userId}` : null;
const getSelectionKey = (userId?: string) =>
  userId ? `pbl6_checkout_selection_${userId}` : null;

const describe = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.correlationId
      ? `${error.message} (${error.correlationId})`
      : error.message;
  }
  return "Đã xảy ra lỗi không xác định.";
};

const formatVnd = (value: number) => `${value.toLocaleString("vi-VN")} ₫`;
const formatAddress = (a: Address) =>
  `${a.recipient_name} (${a.phone}) — ${a.line1}, ${a.ward}, ${a.district}, ${a.city}`;

const newUuid = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

const readAttempt = (userId?: string): Attempt | null => {
  if (!userId) return null;
  try {
    const key = getAttemptKey(userId);
    if (!key) return null;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const a = JSON.parse(raw) as Partial<Attempt> | null;
    if (
      a &&
      a.quote &&
      a.payload &&
      (a.payload.source === "BUY_NOW"
        ? isBuyNow(a.payload.buy_now)
        : Array.isArray(a.payload.cart_item_ids)) &&
      typeof a.key === "string" &&
      Array.isArray(a.items) &&
      typeof a.addressLabel === "string" &&
      (!a.userId || a.userId === userId)
    ) {
      return a as Attempt;
    }
  } catch {
    /* ignore */
  }
  return null;
};

const persistAttempt = (userId: string | undefined, attempt: Attempt) => {
  if (!userId) return;
  try {
    const key = getAttemptKey(userId);
    if (key) {
      sessionStorage.setItem(key, JSON.stringify({ ...attempt, userId }));
    }
  } catch {
    /* ignore */
  }
};

const clearAttempt = (userId?: string) => {
  if (!userId) return;
  try {
    const key = getAttemptKey(userId);
    if (key) sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

const isQuoteConflict = (error: unknown): error is ApiError =>
  error instanceof ApiError &&
  error.status === 409 &&
  (error.code === "QUOTE_CHANGED" || error.code === "QUOTE_EXPIRED");

const isUncertain = (error: unknown): boolean => {
  if (!(error instanceof ApiError)) return true;
  if (error.status === 0) return true;
  return (
    error.status >= 500 ||
    error.status === 408 ||
    error.status === 401 ||
    error.status === 403 ||
    (error.status === 409 && !rejectedCheckoutConflicts.has(error.code))
  );
};

// These codes are returned before creating an attempt, or after the runner has
// durably FAILED and compensated it. Other conflicts keep their original key/body.
const rejectedCheckoutConflicts = new Set([
  "INSUFFICIENT_STOCK",
  "PRODUCT_NOT_AVAILABLE",
  "PRODUCT_UNAVAILABLE",
  "VARIANT_UNAVAILABLE",
  "VARIANT_CONFIGURATION_INVALID",
  "STORE_UNAVAILABLE",
  "STORE_RETURN_ADDRESS_REQUIRED",
  "CART_MAPPING_REQUIRED",
  "CART_PRODUCT_CHANGED",
  "CART_CHANGED",
]);

async function fetchAllCartItems(): Promise<CartItem[]> {
  const byId = new Map<string, CartItem>();
  let total = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await request<CartList>(
      `/cart/items?page=${page}&size=${PAGE_SIZE}`,
    );
    total = data.total;
    for (const item of data.items) byId.set(item.id, item);
    if (byId.size >= total || data.items.length === 0) break;
  }
  if (byId.size < total) {
    throw new Error(
      `Không thể tải đầy đủ giỏ hàng (${byId.size}/${total} mục). Vui lòng thử lại.`,
    );
  }
  return Array.from(byId.values());
}

const readSelection = (userId?: string, state?: unknown): string[] => {
  if (
    state &&
    typeof state === "object" &&
    "checkoutUserId" in state &&
    !ownsCheckoutState(userId, state)
  )
    return [];
  const fromState = (state as { cartItemIds?: unknown } | null)?.cartItemIds;
  if (
    ownsCheckoutState(userId, state) &&
    Array.isArray(fromState) &&
    fromState.length > 0
  ) {
    return fromState.filter(
      (value): value is string => typeof value === "string",
    );
  }
  if (!userId) return [];
  try {
    const key = getSelectionKey(userId);
    if (!key) return [];
    const raw = sessionStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
};

export const CheckoutPage: React.FC = () => {
  const { session } = useAuth();
  const userId = session?.context?.user_id;
  const location = useLocation();

  return <CheckoutInner key={userId + ":" + location.key} userId={userId} />;
};

interface InnerProps {
  userId?: string;
}

const CheckoutInner: React.FC<InnerProps> = ({ userId }) => {
  const location = useLocation();
  const cache = useQueryClient();

  const [validatingVouchers, setValidatingVouchers] = useState(false);
  const voucherFlight = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [attempt, setAttempt] = useState<Attempt | null>(() =>
    readAttempt(userId),
  );
  const hasAttempt = attempt !== null;
  const [buyNow] = useState<BuyNowSelection | undefined>(() =>
    attempt?.payload.source === "BUY_NOW"
      ? attempt.payload.buy_now
      : readBuyNow(userId, location.state),
  );
  const [selectedIds] = useState<string[]>(() =>
    attempt
      ? attempt.payload.source === "BUY_NOW"
        ? []
        : attempt.payload.cart_item_ids
      : readSelection(userId, location.state),
  );
  const sourceKey = buyNow
    ? "BUY_NOW:" + JSON.stringify(buyNow)
    : "CART:" + JSON.stringify([...selectedIds].sort());
  const addressReturnState = userId
    ? checkoutState(userId, buyNow ? { buyNow } : { cartItemIds: selectedIds })
    : undefined;
  const [draft] = useState(() => readDraft(userId, sourceKey));
  const [savedResult] = useState(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("pbl6_checkout_result_" + userId) ?? "null",
      );
      return saved?.navigationKey === location.key &&
        Array.isArray(saved.orders)
        ? saved
        : null;
    } catch {
      return null;
    }
  });

  const [items, setItems] = useState<CartItem[]>(() => attempt?.items ?? []);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string>(
    () =>
      attempt?.payload.address_id ??
      readCheckoutAddress(userId, location.state) ??
      draft?.addressId ??
      "",
  );
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quotedInput, setQuotedInput] = useState("");
  const acceptedVoucherQuote = useRef<{fingerprint: string; quote: Quote} | null>(null);
  const [selectedMethods, setSelectedMethods] = useState<
    Record<string, "COD" | "SANDBOX">
  >(draft?.methods ?? {});
  const incomingVouchers = (() => {
    const locV = (location.state as any)?.vouchers;
    if (
      locV &&
      (locV.platform_voucher_code ||
        (locV.store_vouchers && Object.keys(locV.store_vouchers).length > 0))
    ) {
      return locV;
    }
    try {
      const stored = sessionStorage.getItem("pbl6_cart_vouchers_" + userId);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const [voucherDraft, setVoucherDraft] = useState<Record<string, string>>(() => {
    if (draft?.voucherDraft && Object.keys(draft.voucherDraft).length > 0)
      return draft.voucherDraft;
    return incomingVouchers?.store_vouchers ?? {};
  });
  const [platformDraft, setPlatformDraft] = useState<string>(() => {
    if (draft?.platformDraft) return draft.platformDraft;
    return incomingVouchers?.platform_voucher_code ?? "";
  });
  const [vouchers, setVouchers] = useState<
    Pick<ConfirmPayload, "platform_voucher_code" | "store_vouchers">
  >(() => {
    if (
      draft?.vouchers &&
      (draft.vouchers.platform_voucher_code ||
        (draft.vouchers.store_vouchers &&
          Object.keys(draft.vouchers.store_vouchers).length > 0))
    ) {
      return draft.vouchers;
    }
    const cleanStore = incomingVouchers?.store_vouchers ?? {};
    return {
      ...(incomingVouchers?.platform_voucher_code
        ? { platform_voucher_code: incomingVouchers.platform_voucher_code }
        : {}),
      ...(Object.keys(cleanStore).length > 0 ? { store_vouchers: cleanStore } : {}),
    };
  });
  const [createdOrders, setCreatedOrders] = useState<
    OperationOutputs["confirmCheckout"]["orders"]
  >(savedResult?.orders ?? []);

  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(!!savedResult);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [missingAddress, setMissingAddress] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const [staleTotal, setStaleTotal] = useState<number | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [quoteTick, setQuoteTick] = useState(0);

  const inFlight = useRef(false);
  useEffect(() => {
    if (!userId || hasAttempt || created) return;
    try {
      sessionStorage.setItem(
        "pbl6_checkout_draft_" + userId,
        JSON.stringify({
          source: sourceKey,
          savedAt: Date.now(),
          addressId,
          methods: selectedMethods,
          voucherDraft,
          platformDraft,
          vouchers,
        }),
      );
    } catch {
      /* The form remains usable without storage. */
    }
  }, [
    userId,
    sourceKey,
    hasAttempt,
    created,
    addressId,
    selectedMethods,
    voucherDraft,
    platformDraft,
    vouchers,
  ]);

  const paymentMethods = useMemo(
    () =>
      items.reduce<Record<string, "COD" | "SANDBOX">>((acc, item) => {
        acc[item.store_id] = selectedMethods[item.store_id] ?? "COD";
        return acc;
      }, {}),
    [items, selectedMethods],
  );
  const quoteInput = useMemo<OperationInputs["quoteCheckout"]["body"]>(
    () => ({
      ...(buyNow
        ? { source: "BUY_NOW" as const, buy_now: buyNow }
        : { cart_item_ids: items.map((item) => item.id) }),
      address_id: addressId,
      payment_methods: paymentMethods,
      ...vouchers,
    }),
    [items, buyNow, addressId, paymentMethods, vouchers],
  );
  // Bind a quote to the exact input displayed, including the render before its effect starts.
  const inputFingerprint = JSON.stringify(quoteInput);
  const latestInput = useRef(inputFingerprint);
  latestInput.current = inputFingerprint;

  const storeGroups = useMemo(() => {
    const groups = new Map<string, CartItem[]>();
    items.forEach((item) =>
      groups.set(item.store_id, [...(groups.get(item.store_id) ?? []), item]),
    );
    return Array.from(groups.entries());
  }, [items]);

  useEffect(() => {
    if (
      !userId ||
      hasAttempt ||
      created ||
      (selectedIds.length === 0 && !buyNow)
    )
      return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setMissingAddress(false);
      setLoadError(null);
      setQuote(null);
      setQuoteError(null);
      try {
        const [cart, book] = await Promise.all([
          buyNow
            ? callOperation("getProduct", {
                path: { id: buyNow.product_id },
              }).then((product) => {
                if (
                  !product.store_id ||
                  !product.variants?.some(
                    (v) => v.id === buyNow.variant_id && v.status === "ACTIVE",
                  )
                )
                  throw new Error(
                    "Phân loại mua ngay không còn khả dụng. Hãy quay lại sản phẩm để chọn lại.",
                  );
                return [
                  {
                    id: "buy-now:" + buyNow.variant_id,
                    product_id: buyNow.product_id,
                    variant_id: buyNow.variant_id,
                    store_id: product.store_id,
                    quantity: buyNow.quantity,
                  },
                ];
              })
            : fetchAllCartItems(),
          readAddressBook().then((items) => ({ items })),
        ]);
        if (cancelled) return;
        const wanted = new Set(selectedIds);
        const chosen = buyNow
          ? cart
          : cart.filter((item) => wanted.has(item.id));
        if (!buyNow && chosen.length !== wanted.size) {
          setLoadError(
            `${wanted.size - chosen.length} sản phẩm đã chọn không còn trong giỏ hàng. Vui lòng quay lại giỏ hàng và chọn lại.`,
          );
          return;
        }
        if (book.items.length === 0) {
          setMissingAddress(true);
          setItems([]);
          setAddresses([]);
          setAddressId("");
          return;
        }
        setItems(chosen);
        setAddresses(book.items);
        setAddressId((prev) =>
          prev && book.items.some((a) => a.id === prev)
            ? prev
            : (book.items.find((a) => a.is_default) ?? book.items[0]).id,
        );
      } catch (error) {
        if (!cancelled)
          setLoadError(
            error instanceof Error && !(error instanceof ApiError)
              ? error.message
              : describe(error),
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, hasAttempt, selectedIds, buyNow, reloadTick, created]);

  useEffect(() => {
    if (!savedResult?.purchase_group_id) return;
    let active = true;
    callOperation("getPurchaseGroupOrders", {
      path: { id: savedResult.purchase_group_id },
    })
      .then((result) => {
        if (active) setCreatedOrders(result.orders);
      })
      .catch(() => {
        if (active)
          setLoadError(
            "Đơn đã được ghi nhận; chưa tải lại được trạng thái mới. Bạn có thể kiểm tra trong Đơn hàng của tôi.",
          );
      });
    return () => {
      active = false;
    };
  }, [savedResult]);

  useEffect(() => {
    if (hasAttempt || created || items.length === 0 || !addressId) return;
    if (acceptedVoucherQuote.current?.fingerprint === inputFingerprint) {
      setQuote(acceptedVoucherQuote.current.quote);
      setQuotedInput(inputFingerprint);
      setQuoteError(null);
      setQuoting(false);
      acceptedVoucherQuote.current = null;
      return;
    }
    acceptedVoucherQuote.current = null;
    let cancelled = false;
    setQuote(null);
    setQuoteError(null);
    setQuoting(true);
    callOperation("quoteCheckout", {
      body: JSON.parse(inputFingerprint),
    })
      .then((result) => {
        if (!cancelled) {
          setQuote(result);
          setQuotedInput(inputFingerprint);
        }
      })
      .catch((error) => {
        if (!cancelled) setQuoteError(describe(error));
      })
      .finally(() => {
        if (!cancelled) setQuoting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasAttempt, created, items, addressId, inputFingerprint, quoteTick]);

  const dropAttempt = () => {
    clearAttempt(userId);
    setAttempt(null);
    setItems([]);
    setQuote(null);
  };

  const confirmOrder = async () => {
    if (inFlight.current || !userId) return;

    let current = attempt;
    if (!current) {
      if (
        !quote ||
        !addressId ||
        quotedInput !== inputFingerprint ||
        voucherFlight.current
      )
        return;
      if (Date.parse(quote.expires_at) <= Date.now()) {
        setStaleTotal(quote.payable_total_vnd);
        setConflictNotice(
          "Báo giá đã hết hạn. Đang tính lại, vui lòng kiểm tra tổng mới rồi xác nhận lại.",
        );
        setQuote(null);
        setQuoteTick((n) => n + 1);
        return;
      }
      const address = addresses.find((a) => a.id === addressId);
      current = {
        quote,
        key: newUuid(),
        items,
        addressLabel: address ? formatAddress(address) : addressId,
        userId,
        payload: {
          ...quoteInput,
          quote_id: quote.quote_id,
          expected_payable_total_vnd: quote.payable_total_vnd,
        },
      };
      persistAttempt(userId, current);
      setAttempt(current);
    }

    inFlight.current = true;
    setSubmitting(true);
    setConfirmError(null);
    setConflictNotice(null);
    setStaleTotal(null);
    try {
      const result = await callOperation("confirmCheckout", {
        headers: { "idempotency-key": current.key },
        body: current.payload,
      });
      setCreatedOrders(result.orders ?? []);
      try {
        sessionStorage.setItem(
          "pbl6_checkout_result_" + userId,
          JSON.stringify({ ...result, navigationKey: location.key }),
        );
      } catch {
        /* Server purchase-group lookup remains available. */
      }
      clearBuyNow(userId);
      try {
        sessionStorage.removeItem("pbl6_checkout_draft_" + userId);
      } catch {
        /* Optional storage. */
      }
      await cache.invalidateQueries({ queryKey: ["cart-summary"] });
      clearAttempt(userId);
      const selKey = getSelectionKey(userId);
      if (selKey) {
        try {
          sessionStorage.removeItem(selKey);
        } catch {
          /* ignore */
        }
      }
      setCreated(true);
    } catch (error) {
      // The request may already have committed before auth changed/was lost.
      // Keep this user's immutable attempt; a later login must reconcile it.
      if (error instanceof ApiError && error.code === "SESSION_CHANGED") return;
      if (isQuoteConflict(error)) {
        setStaleTotal(current.quote.payable_total_vnd);
        setConflictNotice(
          error.code === "QUOTE_EXPIRED"
            ? "Báo giá đã hết hạn. Đã tính lại, vui lòng kiểm tra tổng mới rồi xác nhận lại."
            : "Giá hoặc tồn kho đã thay đổi. Đã tính lại, vui lòng kiểm tra tổng mới rồi xác nhận lại.",
        );
        dropAttempt();
      } else if (isUncertain(error)) {
        setConfirmError(
          `${describe(error)} Chưa xác định được đơn hàng đã được tạo hay chưa. ` +
            'Bấm Đặt hàng để kiểm tra đơn này. Hệ thống giữ nguyên thông tin để tránh đặt trùng.',
        );
      } else {
        setConfirmError(describe(error));
        dropAttempt();
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const applyVouchers = async (
    targetPlatformCode: string,
    targetStoreDraft: Record<string, string>,
  ) => {
    if (submitting || quoting || voucherFlight.current) return false;
    voucherFlight.current = true;
    setValidatingVouchers(true);
    setQuoteError(null);
    const fingerprint = inputFingerprint;
    const store_vouchers = Object.fromEntries(
      storeGroups
        .map(([id]) => [id, (targetStoreDraft[id] ?? "").trim()])
        .filter(([, code]) => code),
    );
    const voucherPayload = {
      ...(targetPlatformCode.trim()
        ? { platform_voucher_code: targetPlatformCode.trim() }
        : {}),
      ...(Object.keys(store_vouchers).length ? { store_vouchers } : {}),
    };
    const {
      platform_voucher_code: _oldPlatform,
      store_vouchers: _oldStore,
      ...base
    } = quoteInput;
    try {
      if (
        voucherPayload.platform_voucher_code ||
        voucherPayload.store_vouchers
      ) {
        await callOperation("validateVouchers", {
          body: { ...base, ...voucherPayload },
        });
      }
      if (latestInput.current !== fingerprint) {
        setQuoteError(
          "Thông tin đặt hàng vừa thay đổi. Kiểm tra lại rồi áp dụng mã lần nữa.",
        );
        return false;
      }
      setVouchers(voucherPayload);
      setQuoteTick((n) => n + 1);
      return true;
    } catch (error) {
      setQuoteError(describe(error));
      return false;
    } finally {
      voucherFlight.current = false;
      setValidatingVouchers(false);
    }
  };

  const shownQuote = attempt
    ? attempt.quote
    : quotedInput === inputFingerprint
      ? quote
      : null;
  const error = confirmError ?? loadError ?? quoteError;

  if (created) {
    return (
      <div className="checkout-page space-y-4">
        <header className="checkout-success">
          <CheckCircle2 size={48} aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold">Đã tạo nhóm đơn hàng</h1>
            <p>
              Mỗi cửa hàng xử lý một đơn riêng. Theo dõi giao hàng và thanh toán
              theo từng đơn bên dưới.
            </p>
          </div>
        </header>
        {loadError && <p role="alert">{loadError}</p>}
        <Link to="/customer/orders">Xem đơn hàng của tôi</Link>
        {createdOrders.map((order) => (
          <div key={order.id} className="boot-card">
            <p>
              <StoreLabel id={order.store_id} />
            </p>
            <p>
              Đơn #{order.id.slice(-8).toUpperCase()} ·{" "}
              {orderStatusLabel(order.status)} ·{" "}
              {paymentMethodLabel(order.payment_method)}
            </p>
            <p>Phải trả: {formatVnd(order.amounts.payable_vnd)}</p>
            {order.amounts.payable_vnd === 0 && (
              <p>
                  Đơn 0đ, không cần thanh toán.
              </p>
            )}
            <Link to={`/customer/orders/${order.id}`}>Xem chi tiết đơn</Link>
            {order.payment_method === "SANDBOX" &&
              order.status === "AWAITING_PAYMENT" &&
              order.amounts.payable_vnd > 0 && (
                <p>
                  <Link to={`/orders/${order.id}/pay`}>
                    Chuyển khoản
                  </Link>
                </p>
              )}
          </div>
        ))}
        <Link to="/" className="text-indigo-600 hover:underline">
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  if (selectedIds.length === 0 && !buyNow) {
    return (
      <div className="checkout-page space-y-4">
        <h1 className="text-2xl font-bold">Kiểm tra và đặt hàng</h1>
        <p className="text-gray-600">
          Chưa có sản phẩm nào được chọn để thanh toán.
        </p>
        <Link to="/cart" className="text-indigo-600 hover:underline">
          &larr; Quay lại giỏ hàng
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <Link
        to={buyNow ? "/products/" + buyNow.product_id : "/cart"}
        state={buyNow && userId ? checkoutState(userId, { buyNow }) : undefined}
        className="text-indigo-600 hover:underline mb-4 inline-block text-sm"
      >
        &larr; {buyNow ? "Quay lại sản phẩm" : "Quay lại giỏ hàng"}
      </Link>
      <h1 className="text-2xl font-bold mb-6">Kiểm tra và đặt hàng</h1>

      {!loading && !loadError && !missingAddress && items.length > 0 && <ol
        className="checkout-steps"
        aria-label="Các phần cần kiểm tra trước khi đặt"
      >
        <li>
          <a href="#checkout-address">1. Địa chỉ</a>
        </li>
        <li>
          <a href="#checkout-items">2. Sản phẩm</a>
        </li>
        <li>
          <a href="#checkout-payment">3. Thanh toán</a>
        </li>
        <li>
          <a href="#checkout-vouchers">4. Ưu đãi và tổng tiền</a>
        </li>
      </ol>}
      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm"
        >
          {error}
        </div>
      )}

      {hasAttempt && !confirmError && (
        <div
          role="status"
          className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded mb-4 text-sm"
        >
          Kết nối bị gián đoạn khi đặt hàng. Thông tin đơn đang được giữ nguyên.
          Nhấn &quot;Kiểm tra đơn đã gửi&quot; để kiểm tra an toàn, tránh tạo
          đơn trùng.
        </div>
      )}

      {conflictNotice && !hasAttempt && (
        <div
          role="status"
          className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded mb-4 text-sm"
        >
          {conflictNotice}
        </div>
      )}

      {loading && (
        <p className="text-gray-500">Đang tải thông tin thanh toán...</p>
      )}

      {!loading && missingAddress && (
        <section id="checkout-address" className="bg-white p-6 rounded-lg shadow space-y-3">
          <h2 className="text-lg font-bold">Địa chỉ nhận hàng</h2>
          <p role="alert">Bạn chưa có địa chỉ nhận hàng.</p>
          <Link
            to="/customer/addresses?returnTo=%2Fcheckout&add=1"
            state={addressReturnState}
            className="ui-button ui-button-primary"
          >
            Thêm địa chỉ nhận hàng
          </Link>
        </section>
      )}

      {!loading && loadError && (
        <UiButton variant="secondary" onClick={() => setReloadTick((n) => n + 1)}>
          Thử lại
        </UiButton>
      )}

      {!loading && !loadError && !missingAddress && items.length > 0 && (
        <div className="checkout-layout">
          <div className="checkout-sections space-y-6">
            <div
              id="checkout-address"
              className="bg-white p-6 rounded-lg shadow"
            >
              <h2 className="text-lg font-bold mb-3">1. Địa chỉ nhận hàng</h2>
              {attempt ? (
                <p className="text-sm text-gray-700">{attempt.addressLabel}</p>
              ) : (
                <>
                  {(() => {
                    const selectedAddress = addresses.find((a) => a.id === addressId);
                    if (selectedAddress && !showAddressPicker) {
                      return (
                        <div className="flex items-start justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded">
                          <div>
                            <div className="flex items-center gap-2">
                              <strong className="text-sm font-semibold text-slate-900">
                                {selectedAddress.recipient_name} · {selectedAddress.phone}
                              </strong>
                              {selectedAddress.is_default && (
                                <span className="text-xs bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">Mặc định</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-1">
                              {[selectedAddress.line1, selectedAddress.ward, selectedAddress.district, selectedAddress.city]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          </div>
                          <UiButton
                            type="button"
                            variant="secondary"
                            className="text-xs py-1 px-2.5 shrink-0"
                            onClick={() => setShowAddressPicker(true)}
                          >
                            Thay đổi
                          </UiButton>
                        </div>
                      );
                    }
                    return (
                      <>
                        <fieldset className="checkout-addresses">
                          <legend className="sr-only">Địa chỉ nhận hàng</legend>
                          {addresses.map((a) => (
                            <label
                              className={
                                "checkout-address-option " +
                                (addressId === a.id ? "is-selected" : "")
                              }
                              key={a.id}
                            >
                              <input
                                type="radio"
                                name="checkout-address"
                                value={a.id}
                                checked={addressId === a.id}
                                onChange={() => {
                                  setConfirmError(null);
                                  setAddressId(a.id);
                                  setShowAddressPicker(false);
                                }}
                              />
                              <span>
                                <strong>
                                  {a.recipient_name} · {a.phone}
                                </strong>
                                {a.is_default && <small>Mặc định</small>}
                                <span>
                                  {[a.line1, a.ward, a.district, a.city]
                                    .filter(Boolean)
                                    .join(", ")}
                                </span>
                              </span>
                            </label>
                          ))}
                        </fieldset>
                        <div className="flex items-center gap-3 mt-2">
                          {selectedAddress && (
                            <UiButton
                              type="button"
                              variant="secondary"
                              className="text-xs py-1 px-2.5"
                              onClick={() => setShowAddressPicker(false)}
                            >
                              Thu gọn
                            </UiButton>
                          )}
                          <Link
                            to="/customer/addresses?returnTo=%2Fcheckout"
                            state={addressReturnState}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            Quản lý địa chỉ
                          </Link>
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
            </div>

            <div
              id="checkout-items"
              className="bg-white p-6 rounded-lg shadow space-y-4"
            >
              <h2 className="text-lg font-bold mb-1">
                2. Sản phẩm từ các cửa hàng
              </h2>
              {storeGroups.length > 1 && (
                <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-3 py-1.5 mb-2">
                  Đơn hàng gồm {storeGroups.length} gian hàng. Hệ thống sẽ tạo {storeGroups.length} đơn hàng riêng biệt với phí giao và phương thức thanh toán tương ứng.
                </p>
              )}
              {storeGroups.map(([storeId, storeItems]) => (
                <div key={storeId} className="border-t pt-3">
                  <h3 className="checkout-store-heading">
                    <StoreLabel id={storeId} />
                  </h3>
                  {storeItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-sm py-1 border-b border-gray-100"
                    >
                      <CartProduct
                        productId={item.product_id}
                        variantId={item.variant_id}
                        quantity={item.quantity}
                        quotedLine={shownQuote?.stores
                          ?.find((s) => s.store_id === item.store_id)
                          ?.items?.find(
                            (line) => line.variant_id === item.variant_id,
                          )}
                      />
                      <span className="text-gray-500">
                        Số lượng: {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <section
              id="checkout-payment"
              className="bg-white p-6 rounded-lg shadow space-y-4"
            >
              <h2 className="text-lg font-bold">3. Phương thức thanh toán</h2>
              <p className="text-xs text-slate-500 m-0">
                COD trả khi nhận hàng. Chuyển khoản sau khi đặt đơn.
              </p>
              {!attempt && (
                <div className="checkout-global-payment my-3 p-3 bg-slate-50 border border-slate-200 rounded">
                  <span className="block text-xs font-semibold text-slate-700 mb-2">
                    Phương thức thanh toán toàn đơn:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const allSame = storeGroups.every(
                        ([storeId]) => paymentMethods[storeId] === paymentMethods[storeGroups[0]?.[0]],
                      );
                      const currentUnified = allSame ? paymentMethods[storeGroups[0]?.[0]] : undefined;
                      const applyUnified = (method: "COD" | "SANDBOX") => {
                        setSelectedMethods((curr) => {
                          const next = { ...curr };
                          storeGroups.forEach(([sid]) => {
                            next[sid] = method;
                          });
                          return next;
                        });
                      };
                      return (
                        <>
                          <button
                            type="button"
                            className={`ui-button text-xs py-1.5 px-3 rounded ${
                              currentUnified === "COD"
                                ? "ui-button-primary"
                                : "ui-button-secondary bg-white"
                            }`}
                            disabled={submitting}
                            onClick={() => applyUnified("COD")}
                          >
                            Thanh toán khi nhận hàng (COD)
                          </button>
                          <button
                            type="button"
                            className={`ui-button text-xs py-1.5 px-3 rounded ${
                              currentUnified === "SANDBOX"
                                ? "ui-button-primary"
                                : "ui-button-secondary bg-white"
                            }`}
                            disabled={submitting}
                            onClick={() => applyUnified("SANDBOX")}
                          >
                            Chuyển khoản qua SePay
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
              {storeGroups.length > 1 && !attempt ? (
                <details className="text-xs text-slate-600 mt-2">
                  <summary className="cursor-pointer text-slate-500 hover:text-slate-700 font-medium">
                    Tùy chỉnh riêng cho từng gian hàng ({storeGroups.length} gian hàng)
                  </summary>
                  <div className="mt-2 space-y-2">
                    {storeGroups.map(([storeId]) => {
                      const storeQuote = shownQuote?.stores?.find((s) => s.store_id === storeId);
                      return (
                        <div key={storeId} className="p-2 border rounded bg-white flex items-center justify-between gap-2">
                          <div>
                            <strong><StoreLabel id={storeId} /></strong>
                            {storeQuote && <span className="text-xs text-slate-500 ml-2">Phí giao {formatVnd(storeQuote.amounts.shipping_vnd)}</span>}
                          </div>
                          <select
                            aria-label={"Thanh toán cửa hàng " + storeId}
                            value={paymentMethods[storeId]}
                            disabled={submitting}
                            className="text-xs p-1 border rounded"
                            onChange={(e) =>
                              setSelectedMethods((current) => ({
                                ...current,
                                [storeId]: e.target.value as "COD" | "SANDBOX",
                              }))
                            }
                          >
                            <option value="COD">COD</option>
                            <option value="SANDBOX">SePay</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </details>
              ) : attempt ? (
                <div className="space-y-1 mt-2">
                  {storeGroups.map(([storeId]) => (
                    <p key={storeId} className="text-xs text-slate-600">
                      <StoreLabel id={storeId} />: {attempt.payload.payment_methods[storeId] === "SANDBOX" ? "Chuyển khoản qua SePay" : "COD"}
                    </p>
                  ))}
                </div>
              ) : null}
            </section>
            <div
              id="checkout-vouchers"
              className="bg-white p-6 rounded-lg shadow"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-lg font-bold m-0">4. Mã ưu đãi</h2>
                {!attempt && (
                  <UiButton
                    type="button"
                    variant="secondary"
                    className="text-xs py-1.5 px-3"
                    onClick={() => setPickerOpen(true)}
                  >
                    Chọn mã ưu đãi
                  </UiButton>
                )}
              </div>
              {pickerOpen && !attempt && (
                <VoucherPicker
                  storeIds={storeGroups.map(([id]) => id)}
                  selection={{...quoteInput, mode: 'AUTO'}}
                  onClose={() => setPickerOpen(false)}
                  initialVouchers={{
                    platform_voucher_code: platformDraft,
                    store_vouchers: voucherDraft,
                  }}
                  onPick={(picked, result) => {
                    if (latestInput.current !== inputFingerprint || submitting || quoting || !result.quote) return false;
                    const nextPlatform = picked.platform_voucher_code ?? "";
                    const nextStore = picked.store_vouchers ?? {};
                    const {platform_voucher_code: _platform, store_vouchers: _stores, ...base} = quoteInput;
                    const nextInput = {...base, ...picked};
                    acceptedVoucherQuote.current = {fingerprint: JSON.stringify(nextInput), quote: result.quote};
                    setPlatformDraft(nextPlatform);
                    setVoucherDraft(nextStore);
                    setVouchers(picked);
                    setQuoteTick(n => n + 1);
                    return true;
                  }}
                />
              )}
              {attempt ? (
                <>
                  <p>
                    Voucher sàn:{" "}
                    {attempt.payload.platform_voucher_code ?? "Không dùng"}
                  </p>
                  {Object.entries(attempt.payload.store_vouchers ?? {}).map(
                    ([id, code]) => (
                      <p key={id}>Voucher gian hàng: {code}</p>
                    ),
                  )}
                  <p>
                    Giữ nguyên lựa chọn khi kiểm tra lại đơn này.
                  </p>
                </>
              ) : (
                <>
                  {(vouchers.platform_voucher_code || (vouchers.store_vouchers && Object.keys(vouchers.store_vouchers).length > 0)) && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {vouchers.platform_voucher_code && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          Sàn: <strong>{vouchers.platform_voucher_code}</strong>
                        </span>
                      )}
                      {Object.entries(vouchers.store_vouchers ?? {}).map(([id, code]) => (
                        <span key={id} className="inline-flex items-center gap-1 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          <StoreLabel id={id} />: <strong>{code}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                  <details className="text-xs text-slate-600 mt-2">
                    <summary className="cursor-pointer text-slate-500 hover:text-slate-700 font-medium">
                      Hoặc nhập mã voucher trực tiếp
                    </summary>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await applyVouchers(platformDraft, voucherDraft);
                      }}
                      className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded space-y-2"
                    >
                      <label htmlFor="platform-voucher-input" className="block">
                        <span className="block font-medium mb-1">
                          Voucher toàn sàn
                          {platformDraft.trim() ? (
                            platformDraft.trim() === (vouchers.platform_voucher_code ?? "").trim() ? (
                              <span style={{ marginLeft: 8, fontSize: "12px", color: "#15803d", fontWeight: 600 }}>✓ Đã áp dụng</span>
                            ) : (
                              <span style={{ marginLeft: 8, fontSize: "12px", color: "#b45309" }}>(Chưa áp dụng - bấm Áp dụng để tính lại)</span>
                            )
                          ) : null}
                        </span>
                        <input
                          id="platform-voucher-input"
                          value={platformDraft}
                          maxLength={50}
                          className="w-full text-xs p-1.5 border rounded"
                          onChange={(e) =>
                            setPlatformDraft(e.target.value.toUpperCase())
                          }
                        />
                      </label>
                      {storeGroups.map(([id]) => {
                        const isStoreApplied =
                          !!(voucherDraft[id] ?? "").trim() &&
                          (voucherDraft[id] ?? "").trim() === (vouchers.store_vouchers?.[id] ?? "").trim();
                        return (
                          <label key={id} htmlFor={"store-voucher-" + id} className="block">
                            <span className="block font-medium mb-1">
                              Voucher gian hàng <StoreLabel id={id} />
                              {(voucherDraft[id] ?? "").trim() ? (
                                isStoreApplied ? (
                                  <span style={{ marginLeft: 8, fontSize: "12px", color: "#15803d", fontWeight: 600 }}>✓ Đã áp dụng</span>
                                ) : (
                                  <span style={{ marginLeft: 8, fontSize: "12px", color: "#b45309" }}>(Chưa áp dụng - bấm Áp dụng để tính lại)</span>
                                )
                              ) : null}
                            </span>
                            <input
                              id={"store-voucher-" + id}
                              aria-label={"Voucher cửa hàng " + id}
                              value={voucherDraft[id] ?? ""}
                              maxLength={50}
                              className="w-full text-xs p-1.5 border rounded"
                              onChange={(e) =>
                                setVoucherDraft((current) => ({
                                  ...current,
                                  [id]: e.target.value.toUpperCase(),
                                }))
                              }
                            />
                          </label>
                        );
                      })}
                      <UiButton
                        type="submit"
                        variant="secondary"
                        className="text-xs py-1 px-3 mt-1"
                        disabled={submitting || quoting || validatingVouchers}
                      >
                        Áp dụng
                      </UiButton>
                    </form>
                  </details>
                </>
              )}
            </div>
          </div>

          <div
            className="purchase-summary space-y-4"
            role="region"
            aria-label="Tóm tắt thanh toán"
            tabIndex={0}
          >
            <h2 className="text-lg font-bold border-b pb-2">
              Tóm tắt thanh toán
            </h2>

            {quoting && (
              <p className="text-sm text-gray-500">Đang tính báo giá...</p>
            )}

            {shownQuote && (
              <div className="text-sm space-y-2.5">
                <div className="space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span>Tiền hàng</span>
                    <span>{formatVnd(shownQuote.stores?.reduce((s, st) => s + st.amounts.goods_vnd, 0) ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phí giao hàng</span>
                    <span>{formatVnd(shownQuote.stores?.reduce((s, st) => s + st.amounts.shipping_vnd, 0) ?? 0)}</span>
                  </div>
                  {(shownQuote.stores?.reduce((s, st) => s + st.amounts.store_discount_vnd, 0) ?? 0) > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Giảm từ cửa hàng:</span>
                      <span>-{formatVnd(shownQuote.stores?.reduce((s, st) => s + st.amounts.store_discount_vnd, 0) ?? 0)}</span>
                    </div>
                  )}
                  {(shownQuote.stores?.reduce((s, st) => s + st.amounts.platform_discount_vnd, 0) ?? 0) > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Giảm từ sàn:</span>
                      <span>-{formatVnd(shownQuote.stores?.reduce((s, st) => s + st.amounts.platform_discount_vnd, 0) ?? 0)}</span>
                    </div>
                  )}
                </div>

                {staleTotal !== null &&
                  staleTotal !== shownQuote.payable_total_vnd && (
                    <p className="text-xs text-amber-700">
                      Tổng cũ {formatVnd(staleTotal)} &rarr; tổng mới{" "}
                      {formatVnd(shownQuote.payable_total_vnd)}
                    </p>
                  )}

                <div className="flex justify-between items-baseline font-bold text-base text-gray-900 border-t pt-2">
                  <span>Tổng thanh toán</span>
                  <span className="text-indigo-600 text-lg">
                    {formatVnd(shownQuote.payable_total_vnd)}
                  </span>
                </div>

                {/* Short method split if COD and sandbox differ across stores */}
                {(() => {
                  const hasCod = (shownQuote.stores ?? []).some((st) => paymentMethods[st.store_id] !== "SANDBOX");
                  const hasSandbox = (shownQuote.stores ?? []).some((st) => paymentMethods[st.store_id] === "SANDBOX");
                  if (hasCod && hasSandbox) {
                    const codTotal = (shownQuote.stores ?? [])
                      .filter((st) => paymentMethods[st.store_id] !== "SANDBOX")
                      .reduce((sum, st) => sum + st.amounts.payable_vnd, 0);
                    const sandboxTotal = (shownQuote.stores ?? [])
                      .filter((st) => paymentMethods[st.store_id] === "SANDBOX")
                      .reduce((sum, st) => sum + st.amounts.payable_vnd, 0);
                    return (
                      <div className="checkout-payment-summary-box p-2 bg-slate-50 border border-slate-200 rounded text-xs space-y-1" role="region" aria-label="Tóm tắt số tiền theo phương thức thanh toán">
                        <div className="flex justify-between text-slate-700">
                          <span>Trả khi nhận (COD):</span>
                          <strong className="text-emerald-800">{formatVnd(codTotal)}</strong>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Chuyển khoản (SePay):</span>
                          <strong className="text-indigo-700">{formatVnd(sandboxTotal)}</strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Combined single-line expiration notice */}
                {!hasAttempt && (
                  <p
                    className={
                      Date.parse(shownQuote.expires_at) <= now
                        ? "text-xs text-red-700 font-medium"
                        : "text-xs text-slate-500"
                    }
                    role="timer"
                    aria-live="off"
                  >
                    {Date.parse(shownQuote.expires_at) <= now
                      ? "Báo giá đã hết hạn. Vui lòng bấm Tính lại."
                      : `Báo giá có hiệu lực đến ${new Date(shownQuote.expires_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} (còn ${Math.floor(Math.max(0, Date.parse(shownQuote.expires_at) - now) / 60000)}:${String(Math.floor(Math.max(0, Date.parse(shownQuote.expires_at) - now) / 1000) % 60).padStart(2, "0")})`}
                  </p>
                )}

                {!hasAttempt &&
                  !quoting &&
                  (quoteError ||
                    conflictNotice ||
                    (!!shownQuote && Date.parse(shownQuote.expires_at) <= now)) && (
                    <UiButton
                      type="button"
                      onClick={() => setQuoteTick((n) => n + 1)}
                      variant="secondary"
                      className="w-full text-xs py-1.5"
                    >
                      Tính lại
                    </UiButton>
                  )}

                <PurchaseActionBar
                  summary={
                    shownQuote
                      ? formatVnd(shownQuote.payable_total_vnd)
                      : quoting
                        ? "Đang tính…"
                        : "Chưa có báo giá"
                  }
                  label="Tổng thanh toán"
                  onAction={() => void confirmOrder()}
                  disabled={
                    submitting ||
                    validatingVouchers ||
                    (!hasAttempt &&
                      (!shownQuote ||
                        quoting ||
                        Date.parse(shownQuote.expires_at) <= now))
                  }
                >
                  {submitting
                    ? "Đang xử lý đơn hàng..."
                    : hasAttempt
                      ? "Kiểm tra đơn đã gửi"
                      : "Đặt hàng"}
                </PurchaseActionBar>

                {/* Return policy for single-store checkout */}
                {shownQuote.stores?.length === 1 && shownQuote.stores[0].return_policy_snapshot && (
                  <details className="checkout-policy-details text-xs text-slate-600 border-t pt-2">
                    <summary className="cursor-pointer text-indigo-600 hover:text-indigo-800 font-medium py-1">
                      Chính sách đổi trả
                    </summary>
                    <div className="mt-2 pl-1 bg-slate-50 p-2 rounded">
                      <ReturnPolicyNotice policy={shownQuote.stores[0].return_policy_snapshot} />
                    </div>
                  </details>
                )}

                {/* Per-store breakdown available on demand */}
                {(shownQuote.stores ?? []).length > 1 && (
                  <details className="checkout-store-breakdown text-xs text-slate-600 border-t pt-2">
                    <summary className="cursor-pointer text-indigo-600 hover:text-indigo-800 font-medium py-1">
                      Xem chi tiết theo từng shop ({(shownQuote.stores ?? []).length} shop)
                    </summary>
                    <div className="mt-2 space-y-3 pl-1 max-h-60 overflow-y-auto">
                      {shownQuote.stores?.map((store) => (
                        <div key={store.store_id} className="border-b border-slate-100 pb-2 space-y-1">
                          <strong className="text-slate-800 block">
                            <StoreLabel id={store.store_id} />
                          </strong>
                          {store.return_policy_snapshot && (
                            <details className="checkout-policy-details text-[11px]" open>
                              <summary className="cursor-pointer text-indigo-600 font-medium">Đổi trả</summary>
                              <div className="mt-1 bg-slate-50 p-1.5 rounded">
                                <ReturnPolicyNotice policy={store.return_policy_snapshot} />
                              </div>
                            </details>
                          )}
                          <div className="flex justify-between">
                            <span>Hàng hóa:</span>
                            <span>{formatVnd(store.amounts.goods_vnd)}</span>
                          </div>
                          {store.amounts.store_discount_vnd > 0 && (
                            <div className="flex justify-between text-emerald-700">
                              <span>Giảm từ cửa hàng:</span>
                              <span>-{formatVnd(store.amounts.store_discount_vnd)}</span>
                            </div>
                          )}
                          {store.amounts.platform_discount_vnd > 0 && (
                            <div className="flex justify-between text-emerald-700">
                              <span>Giảm từ sàn:</span>
                              <span>-{formatVnd(store.amounts.platform_discount_vnd)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Phí giao hàng:</span>
                            <span>{formatVnd(store.amounts.shipping_vnd)}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-slate-800 pt-0.5">
                            <span>Phải trả ({paymentMethods[store.store_id] === "SANDBOX" ? "chuyển khoản" : "COD"}):</span>
                            <span>{formatVnd(store.amounts.payable_vnd)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {!shownQuote && (
              <PurchaseActionBar
                summary="Chưa có báo giá"
                label="Tổng thanh toán"
                onAction={() => void confirmOrder()}
                disabled={true}
              >
                Đặt hàng
              </PurchaseActionBar>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
