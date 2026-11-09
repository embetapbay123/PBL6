import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { takeAuthReturn, peekAuthReturn, clearAuthReturn } from "./auth-return";
import { useAuth } from "../../../api/auth-context";
import { ProtectedRoute } from "../../../bootstrap/components";
import { LoginForm } from "./LoginForm";
import { DemoLogin } from "./DemoLogin";
import { RegisterForm } from "./RegisterForm";
import { VerifyForm } from "./VerifyForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
export function AuthPage() {
  const { pathname, state } = useLocation(),
    auth = useAuth();
  const forms: Record<string, React.ReactNode> = {
    "/register": <RegisterForm />,
    "/verify-email": <VerifyForm />,
    "/forgot-password": <ForgotPasswordForm />,
    "/reset-password": <ResetPasswordForm />,
    "/change-password": (
      <ProtectedRoute>
        <ChangePasswordForm />
      </ProtectedRoute>
    ),
  };
  const navigate = useNavigate(),
    [pending, setPending] = useState(() => peekAuthReturn());
  useEffect(() => {
    const current = peekAuthReturn();
    setPending(current);
    if (pathname === "/login" && auth.session && current && !current.expired) {
      const target = takeAuthReturn();
      if (target) navigate(target.path, { state: target.state, replace: true });
    }
  }, [pathname, auth.session, navigate]);
  const resume = () => {
    const current = peekAuthReturn();
    if (!current || current.expired) {
      setPending(current);
      return;
    }
    const target = takeAuthReturn();
    if (target) navigate(target.path, { state: target.state, replace: true });
  };
  const login = auth.session ? (
    <section className="boot-card">
      <h2>Đã đăng nhập</h2>
      <Link className="ui-button ui-button-secondary" to="/">Về trang chủ</Link>
    </section>
  ) : (
    <>
      <DemoLogin />
      <LoginForm />
    </>
  );
  return (
    <section key={pathname} className="auth-page">
      {!auth.session && state?.verified && (
        <p role="status">Email đã được xác thực. Bạn có thể đăng nhập.</p>
      )}
      {auth.session && pending && (
        <section className="boot-card" aria-label="Tiếp tục hành trình mua">
          <h2>Tiếp tục mua sắm</h2>
          {pending.expired ? (
            <>
              <p role="status">
                Lựa chọn mua trước đó đã hết hạn. Mở lại trang mua sắm để chọn
                và kiểm tra thông tin hiện tại.
              </p>
              <Link
                to={pending.path}
                onClick={() => {
                  clearAuthReturn();
                  setPending(undefined);
                }}
              >
                Mở lại trang mua sắm
              </Link>
            </>
          ) : (
            <>
              <p>
                Đã đăng nhập. Kiểm tra lại lựa chọn trước khi mua.
              </p>
              <button type="button" onClick={resume}>
                Mua tiếp
              </button>
            </>
          )}
        </section>
      )}
      {auth.session && pathname === "/register" ? (
        <p>
          Đăng xuất trước khi tạo tài khoản khác.
        </p>
      ) : (
        (forms[pathname] ?? login)
      )}
      {!auth.session && (
        <nav className="auth-page-links" aria-label="Tài khoản">
          <Link to="/login">Đăng nhập</Link>
          <Link to="/register">Đăng ký tài khoản</Link>
          <Link to="/forgot-password">Quên mật khẩu</Link>
        </nav>
      )}
    </section>
  );
}
