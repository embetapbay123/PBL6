import { useState } from 'react';
import { callOperation } from '../../../api/operations';
import { ApiError } from '../../../api/client';
import { ErrorView } from '../../../bootstrap/components';
import { useAuthCommand, useEmailToken } from './useAuthCommand';

export function ResetPasswordForm() {
  const command = useAuthCommand();
  const [token, setToken] = useEmailToken();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  return (
    <form
      className="boot-card"
      onSubmit={(e) => {
        e.preventDefault();
        void command.run(async () => {
          if (password !== confirm) {
            throw new ApiError(422, 'PASSWORD_MISMATCH', 'Mật khẩu xác nhận không khớp.');
          }
          await callOperation('confirmResetPassword', {
            body: { token, new_password: password },
          });
          setPassword('');
          setConfirm('');
          setToken('');
          return 'Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.';
        });
      }}
    >
      <h2>Đặt lại mật khẩu</h2>
      <p>
        Dùng mã trong email đặt lại mật khẩu. Không chia sẻ mã.
      </p>
      <fieldset disabled={command.busy}>
        <label>
          Mã đặt lại
          <input
            type="password"
            autoComplete="off"
            required
            maxLength={4096}
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </label>
        <label>
          Mật khẩu mới
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label>
          Xác nhận mật khẩu
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        <button disabled={command.busy}>Đặt lại mật khẩu</button>
      </fieldset>
      {command.error != null && <ErrorView error={command.error} />}
      {command.notice && <p role="status">{command.notice}</p>}
    </form>
  );
}
