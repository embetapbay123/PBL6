# Kiểm chứng khung và nghiệm thu module

Đọc [validation record](validation-record.md) cho kết quả đã chạy; [Test Plan](../test-plan.md) và [acceptance FR/NFR](../requirements-acceptance.md) cho nghiệm thu đích. Test khung không thay test nghiệp vụ chưa triển khai.

| Mức | Lệnh / nội dung | Tiêu chí |
| --- | --- | --- |
| Contract/docs | npm run docs:check; npm run generate:types | Link/schema/ownership/status đủ, generated types đồng bộ |
| Node | npm run build:backend; npm run test:backend | Compile; JWT/service allowlist/SePay raw HMAC/fingerprint |
| Integration | Compose migrate/seed/up rồi tools npm run test:integration | DB ownership, auth refresh/logout/CSRF, scope/version/audit/outbox, duplicate/unrouted/command |
| M4 | compose exec -T m4 python -m pytest -q -p no:cacheprovider | Mock có nhãn, health/auth, không giả AI thật |
| Web | npm run build; npm --prefix frontend run test:e2e | Catalog API, login/profile/restore/logout, mock route còn hoạt động |
| Mobile | cd mobile; flutter analyze; flutter test | Compile/analyze và widget fixture; Android device/APK riêng |
| Load | k6 Catalog và workload nghiệp vụ sau khi đủ module | Report có p95/error/invariant, không kết luận chỉ từ script |
| Recovery | backup → isolated restore, restart worker/service | Không mất pending event, không lặp effect; restore có query/count |

## Điều kiện member bàn giao

- Endpoint đủ phạm vi OpenAPI; DTO runtime; quyền/ownership và state/version/idempotency đúng.
- Migration append-only có kiểm tra trên DB hiện có; không ghi DB service khác.
- Test error/failure/replay cần thiết cho module; UI hiển thị lỗi từ backend/correlation, không giả giao dịch thành công.
- Audit và log không secret/PII; provider side effect có dedup/reference/reconciliation.
- README module/status/backlog cập nhật; payload/ví dụ cho frontend và người tích hợp.

Checkout/payment/kho cần test cạnh tranh/restart ở các ranh giới commit, callback duplicate/out-of-order/sai tiền, hủy/refund; Hoa/Công/Thịnh review chung. Trí kiểm revoked User/membership và hai Store. M4 phải evaluation dataset/metric version, consent và Product card live. Hệ thống chỉ được nghiệm thu sau test FR/NFR thực tế và bảng NOT_RUN được xử lý.

CI scaffold build/test/docs và Compose integration, Flutter analyze/test; không gọi SePay/OpenAI thật, không deploy. Chạy theo lockfile Node/Flutter và pinned Python dependency. Artifact test/screenshot/report không chứa secret.
