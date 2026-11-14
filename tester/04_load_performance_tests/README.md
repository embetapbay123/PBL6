# 04 · Kiểm thử tải & hiệu năng (k6)

```powershell
run_load_test.bat
node ..\run-tests.mjs --suite load --scenario load
```

- Kịch bản: `load.k6.js` (đọc danh sách → chi tiết → liên quan → tìm kiếm).
- Chạy bằng Docker image `grafana/k6:0.57.0`; không cần cài k6.
- Kịch bản & ngưỡng SLA: `../config/server.config.json` → `load`.
- Báo cáo: `../reports/load/load.html`, kèm `summary.json` và `k6-output.log`.
- Lưu ý: `load.k6.js` được mount vào container tại `/work`, nên đường dẫn chứa dấu cách vẫn chạy được.
