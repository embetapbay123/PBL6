import { useNavigate, useLocation } from "react-router-dom";
import { callOperation } from "../../../api/operations";
import { ErrorView } from "../../../bootstrap/components";
import { useAuthCommand, useEmailToken } from "./useAuthCommand";
export function VerifyForm() {
  const navigate = useNavigate(),
    location = useLocation(),
    command = useAuthCommand(),
    [token, setToken] = useEmailToken();
  return (
    <form
      className="boot-card"
      onSubmit={(e) => {
        e.preventDefault();
        void command.run(async () => {
          await callOperation("verifyEmail", { body: { token } });
          setToken("");
          navigate("/login", { replace: true, state: { verified: true } });
          return "Email đã được xác thực. Bạn có thể đăng nhập.";
        });
      }}
    >
      <h2>Xác thực email</h2>
      {location.state?.registered && (
        <p role="status">
          Đã tiếp nhận đăng ký. Kiểm tra email và nhập mã xác thực để tiếp tục.
        </p>
      )}
      <p>
        Mã chỉ được giữ trong tab này. Nếu đã tải lại trang, mở lại liên kết từ
        email hoặc nhập mã; không gửi mã cho người khác.
      </p>
      <fieldset disabled={command.busy}>
        <label>
          Mã xác thực
          <input
            type="password"
            autoComplete="off"
            maxLength={4096}
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </label>
        <button disabled={command.busy}>Xác thực email</button>
      </fieldset>
      {command.error != null && <ErrorView error={command.error} />}{" "}
      {command.notice && <p role="status">{command.notice}</p>}
    </form>
  );
}
