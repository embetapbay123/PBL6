import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  api,
  getAuthSession,
  subscribeAuth,
  startAuthSync,
  refreshAuthContext,
  type AuthTokens,
} from "./client";
const Context = createContext<{
  session?: AuthTokens;
  restoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshContext: () => Promise<void>;
}>({
  restoring: false,
  login: async () => {},
  logout: async () => {},
  refreshContext: async () => {},
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(
    subscribeAuth,
    getAuthSession,
    getAuthSession,
  );
  const [restoring, setRestoring] = useState(
    () =>
      !getAuthSession() &&
      document.cookie
        .split("; ")
        .some((value) => value.startsWith("pbl6_csrf=")),
  );
  useEffect(() => {
    let active = true;
    const stop = startAuthSync();
    if (
      document.cookie
        .split("; ")
        .some((value) => value.startsWith("pbl6_csrf="))
    ) {
      void api
        .restore()
        .catch(() => {})
        .finally(() => {
          if (active) setRestoring(false);
        });
    } else setRestoring(false);
    return () => {
      active = false;
      stop();
    };
  }, []);
  return (
    <Context.Provider
      value={{
        session,
        restoring,
        refreshContext: refreshAuthContext,
        login: async (email, password) => {
          await api.login(email, password);
        },
        logout: api.logout,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
