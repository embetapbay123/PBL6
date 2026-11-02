import { PasswordField } from "../../../components/PasswordField";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../api/auth-context";
import { ErrorView } from "../../../bootstrap/components";
import { useAuthCommand } from "./useAuthCommand";
export function LoginForm() {
  const auth = useAuth(),
    cache = useQueryClient(),
    command = useAuthCommand();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  return (
    <form
      className="boot-card"
      onSubmit={(e) => {
        e.preventDefault();
        void command.run(async () => {
          await auth.login(email, password);
          cache.clear();
          setPassword("");
        });
      }}
    >
      <h2>Đăng nhập</h2>
      <fieldset disabled={command.busy}>
        <label>
          Email
          <input
            type="email"
            required
            maxLength={254}
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Mật khẩu
          <PasswordField
            aria-label="Mật khẩu"
            required
            maxLength={72}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button disabled={command.busy}>
          {command.busy ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
      </fieldset>
      {command.error != null && <ErrorView error={command.error} />}
      <p>
        <Link to="/register">Đăng ký tài khoản</Link> ·{" "}
        <Link to="/forgot-password">Quên mật khẩu</Link>
      </p>
    </form>
  );
}
