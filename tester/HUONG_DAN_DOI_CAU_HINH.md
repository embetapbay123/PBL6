# Hướng dẫn đổi cấu hình

Toàn bộ tuỳ chọn của bộ kiểm thử nằm trong:

```text
C:\PBL6\tester\config\server.config.json
```

Quy tắc đọc cấu hình:

1. `server.config.json` (bắt buộc).
2. `server.config.local.json` (nếu có) – **ghi đè** lên file trên, dùng cho máy cá nhân, không commit.
3. Tham số dòng lệnh và biến môi trường – ưu tiên cao nhất.

> Sau khi sửa JSON, chạy lại test. Không cần build lại gì.

---

## 1. Đổi server kiểm thử

```json
"activeTarget": "demo"
```

| Target | Web | API |
| --- | --- | --- |
| `demo` | `https://demo.congnguyen.me` | `https://demo.congnguyen.me/api/v1` |
| `local` | `http://localhost:8080` | `http://localhost:8080/api/v1` |

Thêm server mới bằng cách thêm một khoá trong `targets`:

```json
"staging": {
  "label": "Server staging nội bộ",
  "webBaseUrl": "http://192.168.1.50:8080",
  "apiBaseUrl": "http://192.168.1.50:8080/api/v1",
  "origin": "http://192.168.1.50:8080",
  "k6BaseUrl": "http://192.168.1.50:8080"
}
```

- `origin`: gửi kèm header `Origin`. Phải khớp `M3_ORIGIN` của backend, nếu không login Web/API sẽ trả `Origin không hợp lệ`.
- `k6BaseUrl`: địa chỉ mà container k6 nhìn thấy. Với máy host Windows dùng `http://host.docker.internal:8080`.

Không sửa file:

```powershell
node run-tests.mjs --suite api --target local
$env:PBL6_API_URL = "http://192.168.1.50:8080/api/v1"; node run-tests.mjs --suite api
```

---

## 2. Đổi tài khoản kiểm thử

```json
"accounts": {
  "customer": {
    "label": "Khách hàng A",
    "email": "customer.a@pbl6.test",
    "demoAccount": "customerA",
    "password": "",
    "passwordEnv": "SEED_PASSWORD",
    "passwordFile": "infrastructure/.env"
  }
}
```

Thứ tự lấy mật khẩu: `password` (nếu điền) → biến môi trường `passwordEnv` → dòng `passwordEnv=...` trong `passwordFile`.

- `demoAccount`: dùng `/auth/demo-login`, **không cần mật khẩu**. Các giá trị hợp lệ của backend: `customerA`, `customerB`, `ownerA`, `ownerB`, `staffA`, `staffB`, `admin`.
- Xoá `demoAccount` nếu muốn đăng nhập bằng email/mật khẩu thật.
- Đổi mật khẩu nhanh: `$env:SEED_PASSWORD = "..."` trước khi chạy.

Các vai trò đang dùng: `customer`, `customerB`, `owner`, `staff`, `admin`. Test nào cần vai trò mới thì thêm khoá tương ứng và dùng `session.login('tên')`.

---

## 3. Đổi tốc độ và giao diện Web test

```json
"web": {
  "headed": true,
  "slowMoMs": 1200,
  "stepDelayMs": 700,
  "timeoutMs": 90000,
  "viewport": { "width": 1440, "height": 900 },
  "mobileViewport": { "width": 390, "height": 844 }
}
```

| Trường | Ý nghĩa |
| --- | --- |
| `headed` | `true` mở Chromium thật; `false` chạy ẩn |
| `slowMoMs` | Làm chậm **từng thao tác** click/gõ. Tăng lên 1500–2500 nếu muốn thầy cô xem rõ |
| `stepDelayMs` | Nghỉ thêm giữa các bước kịch bản |
| `timeoutMs` | Thời gian tối đa một test |
| `viewport` | Kích thước desktop |
| `mobileViewport` | Kích thước cho test mobile |

Ghi đè nhanh: `node run-tests.mjs --suite web --headless` hoặc `--slowmo 2000`.

---

## 4. Đổi phạm vi Unit test

```json
"unit": {
  "suiteFiles": [
    "tests/unit/auth.guard.test.ts",
    "tests/unit/cart.test.ts"
  ]
}
```

Đường dẫn tính từ `backend/`. Thêm/bớt file để tăng giảm số test. Có thể dùng cả thư mục: `"tests/unit"`.

---

## 5. Đổi ngưỡng API và bảo mật

```json
"api": { "maxResponseMs": 3000 },
"security": { "maxResponseMs": 3000, "oversizeKb": 2048 }
```

- `maxResponseMs`: test `API-SLA-01` fail nếu p95 vượt ngưỡng.
- `oversizeKb`: kích thước body dùng cho test gửi dữ liệu quá lớn.

---

## 6. Đổi kịch bản tải (k6)

```json
"load": {
  "activeScenario": "smoke",
  "dockerImage": "grafana/k6:0.57.0",
  "scenarios": {
    "smoke":  { "vus": 20,  "duration": "15s" },
    "load":   { "vus": 100, "duration": "30s" },
    "stress": { "vus": 250, "duration": "60s" }
  },
  "thresholds": {
    "httpReqFailedRate": 0.01,
    "p95Ms": 2000,
    "checksRate": 0.99
  }
}
```

- `activeScenario`: kịch bản mặc định khi chạy `--suite load`.
- Thêm kịch bản mới: thêm khoá trong `scenarios` rồi chọn bằng `--scenario tên`.
- `thresholds`: ngưỡng SLA. Vượt ngưỡng → test tương ứng fail trong báo cáo.

Chạy nhanh không cần sửa file: `node run-tests.mjs --suite load --scenario stress`.

---

## 7. Đổi nơi lưu báo cáo

```json
"reports": {
  "directory": "reports",
  "openAfterRun": true
}
```

- `directory`: tính từ `tester/`. Đổi thành `"reports/2026-11-11"` nếu muốn lưu theo buổi demo.
- `openAfterRun`: tự mở `index.html` sau khi chạy xong. Tắt bằng `--no-open`.

Cấu trúc mỗi suite: `result.json`, `<suite>.html`, `<suite>-junit.xml`. Playwright thêm thư mục `playwright/`.

---

## 8. Các biến môi trường được hỗ trợ

| Biến | Tác dụng |
| --- | --- |
| `PBL6_TARGET` | Ghi đè `activeTarget` |
| `PBL6_WEB_URL` | Ghi đè URL web |
| `PBL6_API_URL` | Ghi đè URL API |
| `PBL6_ORIGIN` | Ghi đè header Origin |
| `PBL6_HEADED` | `0` = chạy ẩn, `1` = mở trình duyệt |
| `PBL6_SLOWMO` | Ghi đè `slowMoMs` |
| `PBL6_SCENARIO` | Ghi đè kịch bản k6 |
| `SEED_PASSWORD` | Mật khẩu đăng nhập cho UI test |

---

## 9. Dùng file ghi đè cục bộ (khuyến nghị)

```powershell
cd C:\PBL6\tester\config
copy server.config.local.example.json server.config.local.json
```

Sửa `server.config.local.json`; file này được merge đè lên cấu hình gốc và nên thêm vào `.gitignore`. Nhờ vậy mỗi máy có thể trỏ server khác nhau mà không sửa file chung.

---

## 10. Kiểm tra nhanh sau khi đổi

```powershell
node run-tests.mjs --suite api --no-open     # ~10 giây
node run-tests.mjs --suite web --headless    # ~1,5 phút
```

Nếu API trả `401`/`403` hàng loạt: kiểm tra `origin`, tài khoản và trạng thái `demo-login` của server. Nếu Web báo lỗi kết nối: mở `webBaseUrl` bằng trình duyệt trước.
