# 05 · Kiểm thử bảo mật hộp đen

```powershell
run_security_tests.bat
node ..\run-tests.mjs --suite security
```

- Test case: `security.tests.mjs` (19 case).
- Phạm vi: JWT giả/alg=none, RBAC, SQL injection, XSS, JSON hỏng, body quá lớn, path traversal, security header, CORS, cookie, rò rỉ dữ liệu, mass assignment.
- Test có `knownIssue` (ví dụ body 2 MB trả 500) hiển thị màu vàng “Lỗi đã biết”, không tính là thất bại.
- Báo cáo: `../reports/security/security.html`.
