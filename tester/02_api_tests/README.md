# 02 · Kiểm thử API

Bộ test black-box gọi trực tiếp server trong `../config/server.config.json`.

```powershell
run_api_tests.bat
node ..\run-tests.mjs --suite api --target local
```

- Test case: `api.tests.mjs` (34 case: catalog, auth, cart, RBAC, SLA).
- Đăng nhập: `/auth/demo-login` theo `accounts.*.demoAccount`; fallback `/auth/login` với `passwordEnv`.
- Báo cáo: `../reports/api/api.html`.
- Thư mục `postman/`: collection Postman gốc và environment để import thủ công, không bắt buộc khi chạy tự động.
