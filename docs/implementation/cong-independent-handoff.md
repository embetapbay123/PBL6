# Công — bàn giao phần độc lập ngày 07/10/2026

Owner: [embetapbay123](https://github.com/embetapbay123). Mục tiêu là có điểm nối và runtime chạy được để member tiếp tục nghiệp vụ. Task rộng vẫn mở nếu còn provider, nguồn sự kiện, chất lượng hoặc luồng liên service chưa nghiệm thu.

| Phần đã bàn giao | Code/tài liệu và PR | Còn để nghiệm thu toàn task |
| --- | --- | --- |
| Payment/COD, consent và tracking inbox | [Week 2 handoff](cong-week2-handoff.md), [PR #90](https://github.com/embetapbay123/PBL6/pull/90) | #55: producer thật M1/M2/M3 đúng owner và kiểm trọn nguồn |
| Callback receipt/follow-up | [Callback handoff](payment-callback-handoff.md), [PR #91](https://github.com/embetapbay123/PBL6/pull/91) | #52: Order consume/recovery với kho thật, webhook SePay Test thực |
| ALS offline, related/baseline, session/history, retrieval, model adapter, metrics/evaluation | [AI runtime handoff](ai-runtime-handoff.md), [PR #92](https://github.com/embetapbay123/PBL6/pull/92) | #56–58: dataset đủ, quality report và model/provider thực |
| Refund request/read, durable lease/retry/UNKNOWN, receipt/audit | [Refund handoff](refund-runtime-handoff.md), [PR #93](https://github.com/embetapbay123/PBL6/pull/93) | #53: bank/provider adapter thật, đối soát tiền dư, nối cancel/expiry của Hoa |
| Load harness, M4 connection reuse, backup/restore drill | [Performance](performance-and-capacity.md), [evidence](evidence/2026-10-07-cong-ops.json), [restore tool](../../scripts/restore_drill.py) | #59–60: dataset/workload đầy đủ, checkout/kho/recovery thực và benchmark model |

## Dùng ngay

Theo [README](../../README.md) để setup/build/migration/seed. M2 hiện tới 009, M4 tới 006; không sửa migration đã apply. Hoa gọi Payment/Refund bằng EntityManager của transaction Order. Thịnh/Trí tiếp command kho và producer/scope của mình; Hatsaphone/Hoa dùng typed API, không tự lấy dữ liệu DB service khác.

Chưa chọn model: `AI_MODE=real`, `CHAT_PROVIDER=none`. Chat trả fallback có lý do `PROVIDER_NOT_CONFIGURED`, card được xác minh từ Catalog thật. Ollama adapter có sẵn để operator cấu hình sau; không download model hoặc gọi API trả phí. Provider lỗi có fallback, Catalog/identity lỗi trả dependency error. Refund worker mặc định DISABLED; không chuyển tiền, không ghi SUCCEEDED từ fixture.

M4 dùng HTTP client chung theo lifespan: 50 connection tối đa, 20 keep-alive, timeout mỗi call nội bộ/Catalog 1 giây, model 2 giây, giữ correlation từng request. Related dùng một ActiveStores snapshot và Product page đã validate trong cùng request; chỉ fetch detail thêm nếu reference không nằm trong page. Không có cache quyền/giá xuyên request hoặc retry command tự động.

## Bằng chứng vận hành

Ngày 07/10/2026, Docker Desktop 16 CPU/7.36 GiB, 1 instance mỗi service, một worker Uvicorn M4, seed 3 Product công khai. k6 0.57.0, profile smoke 100 VU/30 giây, think time 20 giây: Catalog p95 **508.81 ms**, 200 request/0 lỗi; related real cuối p95 **1669.95 ms**, 201 request/0 lỗi (gồm 1 setup). 400/400 shape/status checks mỗi run. Đây là hai burst read nhỏ, **chưa chứng minh NFR toàn marketplace/15 phút/dataset lớn**.

Related ban đầu timeout/error 87.06%; dùng chung client hết lỗi nhưng p95 3043.36 ms; tuning pool và bỏ lookup trùng trong cùng request cho kết quả cuối đạt ngưỡng smoke. Các run tuning có FAIL vẫn giữ raw, không chọn rồi xóa bằng chứng xấu. Run ForYou anonymous trả 401 là cấu hình workload sai và kiểm guard, không đưa vào capacity result. Resources snapshot được lưu; snapshot cuối run không phải peak CPU/RAM.

Restore ngày 07/10/2026 vào 4 database `restore_drill_mX_20261007035228` đạt: SHA-256 dump lưu lại, table counts/schema/constraint/migrations khớp nguồn hiện tại; invariant tiền/tồn/default Address/session không vi phạm. CHECK varchar-array cast được PostgreSQL viết lại sau restore; normalize chỉ đúng dạng cast literal tương đương, test vẫn phát hiện đổi enum/cột/toán tử. Không overwrite hoặc drop DB chạy service. Drill không phải snapshot ACID xuyên 4 DB, không checksum nội dung từng row hay nghiệm thu failover production.

```powershell
python scripts/database_backup.py backup
python scripts/restore_drill.py --backup-dir artifacts/backups/<run-id>
python scripts/test_restore_drill.py
```

Chạy drill khi writers/test/jobs đã dừng trên môi trường dành riêng để nguồn không đổi sau backup; tool từ chối mismatch thay vì báo PASS. Nó tạo DB mới, giữ lại để kiểm tra. Dump và raw result ở artifacts được ignore; không commit vì có dữ liệu. Record JSON trong docs chỉ có số liệu/hash và tên artifact, không chứa token, key, prompt, tài khoản hoặc row data.

## Trạng thái trách nhiệm

PAY-01/PAY-04 và CORE-01/CORE-02 đã Done. #52/#55 và các task rộng #53/#56–61 giữ mở với phần còn thiếu rõ ràng. Không chuyển toàn bộ backlog sang Todo, không đóng task vì có DTO/test fixture. Checkout/Inventory/cancel/producer và UI giữ owner; Công tiếp tích hợp khi có điểm nối thật. Các tuần roadmap vẫn là mục tiêu theo kết quả demo, không phải ngày hoàn thành đã cam kết.


## Evaluation tiếp theo — 07/10/2026

Đã có [bộ kiểm soát AI độc lập](ai-evaluation-handoff.md): dataset synthetic versioned, Content/Behavioral baseline, pipeline chung với DB job, 13 case chat và report/rubric. Synthetic controls chạy đạt; đây chưa phải nghiệm thu hành vi thật hoặc generation với model. #56/#57/#58 giữ mở cho dataset/provider/manual review đúng acceptance, không dùng fixture để đóng task.
