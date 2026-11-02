import { PasswordField } from "../../../components/PasswordField";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { callOperation } from "../../../api/operations";
import { ErrorView } from "../../../bootstrap/components";
import { useAuthCommand } from "./useAuthCommand";
export function RegisterForm() {
  const navigate = useNavigate();
  const command = useAuthCommand(),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState("");
  return (
    <form
      className="boot-card"
      onSubmit={(e) => {
        e.preventDefault();
        void command.run(async () => {
          const result = await callOperation("register", {
            body: {
              email,
              password,
              ...(name.trim() ? { display_name: name.trim() } : {}),
            },
          });
          setPassword("");
          navigate("/verify-email", { state: { registered: true } });
          return (
            result.message ??
            "Yêu cầu đăng ký đã được tiếp nhận. Kiểm tra email để xác thực."
          );
        });
      }}
    >
      <h2>Đăng ký tài khoản</h2>
      <fieldset disabled={command.busy}>
        <label>
          Email
          <input
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Mật khẩu
          <PasswordField
            aria-label="Mật khẩu"
            minLength={8}
            maxLength={72}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {password && (
          <div className="password-guidance">
            <meter
              min={0}
              max={12}
              value={Math.min(password.length, 12)}
              aria-label="Độ dài mật khẩu"
            />
            <p>
              {password.length < 8
                ? "Cần ít nhất 8 ký tự."
                : "Đã đủ độ dài tối thiểu."}{" "}
              Nên dùng từ 12 ký tự, tránh thông tin dễ đoán. Đây là gợi ý, không
              phải xác nhận mật khẩu an toàn.
            </p>
          </div>
        )}
        <label>
          Tên hiển thị
          <input
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button disabled={command.busy}>
          {command.busy ? "Đang tạo tài khoản…" : "Đăng ký"}
        </button>
      </fieldset>
      {command.error != null && <ErrorView error={command.error} />}{" "}
      {command.notice && <p role="status">{command.notice}</p>}
      <Link to="/verify-email">Xác thực bằng mã trong email</Link>
    </form>
  );
}
