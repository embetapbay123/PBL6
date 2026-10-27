import { useRef, useState } from "react";
import { useAuth } from "../api/auth-context";
export function useStoreAccess() {
  const { session } = useAuth();
  const m = session?.context?.store_membership;
  return {
    id: m?.store_id,
    userId: session?.context?.user_id,
    owner: m?.role === "OWNER",
    can: (code: string) =>
      !!m?.store_id &&
      (m?.role === "OWNER" || !!m?.permissions?.includes(code)),
  };
}
export const formatMoney = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value,
  );
export function useCommand() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [notice, setNotice] = useState("");
  const flight = useRef(false);
  return {
    busy,
    error,
    notice,
    setError,
    setNotice,
    run: async (work: () => Promise<void>) => {
      if (flight.current) return;
      flight.current = true;
      setBusy(true);
      setError(undefined);
      setNotice("");
      try {
        await work();
      } catch (e) {
        setError(e);
      } finally {
        flight.current = false;
        setBusy(false);
      }
    },
  };
}
