# Week 7 — Bảo mật, chịu tải, recovery và thiết bị

**Kế hoạch dự kiến**, cập nhật 06/10/2026; 5 ngày làm việc/tuần. [Roadmap toàn bộ](roadmap.md) quy định mốc, điều kiện và cách xử lý trễ; Status thực tế xem [Kanban](https://github.com/users/embetapbay123/projects/1/views/3). Task dưới đây gồm phần tiếp tục/kiểm lại, không có nghĩa mở lại scope đã Done.

## Kết quả cuối tuần

Chứng minh NFR trên release candidate và sửa lỗi theo owner. Không dành cả tuần chỉ để Công test trong khi các member dừng việc.

## Việc từng người

| Owner | Issue | Phần làm tuần này | Mốc bàn giao |
| --- | --- | --- | --- |
| Công | [#59](https://github.com/embetapbay123/PBL6/issues/59), [#60](https://github.com/embetapbay123/PBL6/issues/60) | Điều phối security/100-user load/soak, restart worker, callback recovery và backup→isolated restore. Lưu latency/error/invariant/run ID/commit/môi trường; sửa gateway/M4/Payment thuộc mình. | Ngày 2 báo cáo vòng 1; ngày 5 vòng 2 sau fix với raw artifacts. |
| Thịnh | [#13](https://github.com/embetapbay123/PBL6/issues/13), [#14](https://github.com/embetapbay123/PBL6/issues/14), [#15](https://github.com/embetapbay123/PBL6/issues/15), [#17](https://github.com/embetapbay123/PBL6/issues/17) | Kiểm SKU cuối/concurrent/lock/expiry/restock, upload và Product query/EXPLAIN; sửa oversell/N+1/event indexing và Seller lỗi scope. | Ngày 3 fix M1; ngày 5 retest tải/invariant cùng Công. |
| Hoa | [#22](https://github.com/embetapbay123/PBL6/issues/22), [#24](https://github.com/embetapbay123/PBL6/issues/24), [#25](https://github.com/embetapbay123/PBL6/issues/25), [#29](https://github.com/embetapbay123/PBL6/issues/29), [#36](https://github.com/embetapbay123/PBL6/issues/36) | Kiểm checkout/quota/COD cạnh tranh/crash, M2 query/lock/report; kiểm APK trên thiết bị, mạng chậm/mất mạng/restore/session/quote retry. | Ngày 3 fix M2/Android; ngày 5 bằng chứng thiết bị và transaction recovery. |
| Trí | [#39](https://github.com/embetapbay123/PBL6/issues/39), [#42](https://github.com/embetapbay123/PBL6/issues/42), [#43](https://github.com/embetapbay123/PBL6/issues/43), [#44](https://github.com/embetapbay123/PBL6/issues/44) | Security matrix Customer/Owner/Staff/Admin, IDOR hai Store/User, refresh/reset replay/CSRF/rate limit và audit/log không secret; fix M3/Admin. | Ngày 2 kết quả permission vòng 1; ngày 5 retest token cũ sau khóa/revoke. |
| Hatsaphone | [#5](https://github.com/embetapbay123/PBL6/issues/5), [#63](https://github.com/embetapbay123/PBL6/issues/63), [#66](https://github.com/embetapbay123/PBL6/issues/66), [#68](https://github.com/embetapbay123/PBL6/issues/68), [#70](https://github.com/embetapbay123/PBL6/issues/70) | Customer Web regression trên phone/browser, 401/409/422/501/503, timeout/duplicate click/expired quote; sửa UX/accessibility và tránh lộ credential. | Ngày 3 fix UI; ngày 5 e2e với API thật sau backend retest. |

File bắt đầu/API/checklist đầy đủ ở [bảng task](task-assignment.md) và README module trong issue. Với Payment/kho/AI dùng đúng [contract tích hợp](../integration-contract.md); không tạo contract riêng để vượt dependency.

## Handoff và lịch 5 ngày

Ngày 2 Công/Trí tạo danh sách lỗi có owner, severity, testcase và commit; mỗi owner sửa PR riêng. Ngày 4–5 kiểm lại đúng lỗi và luồng liên quan. Không đổi owner vì lỗi được người khác phát hiện.

1. Ngày 1: lấy main/CI mới, đối chiếu acceptance và phần tồn từ tuần trước; chọn một issue/nhánh chính, kiểm input/fixture và chốt lát cắt bàn giao.
2. Ngày 2: bàn giao API/lát cắt theo bảng cùng quyền, lỗi, ví dụ và test; consumer tích hợp ngay phần đã đạt.
3. Ngày 3: nối dependency thật, gửi PR nhỏ để review; ghi owner/operation đang chờ và tiếp tục phần độc lập.
4. Ngày 4: chạy integration/e2e và các case sai quyền, concurrency/retry phù hợp; sửa lỗi đúng owner.
5. Ngày 5: demo đầu ra tuần, cập nhật evidence/README/endpoint-status và issue/Kanban theo thực tế.

## Điều kiện nghiệm thu

- Theo NFR hiện có: ít nhất 100 user đồng thời, ≥95% request API thường dưới 2 giây; RAG mục tiêu dưới 4 giây theo điều kiện MVP. Báo từng route/p95/throughput/lỗi, không dùng số trung bình hoặc mock AI để kết luận.
- Crash/restart/outbox/inbox/reconciliation và restore có query/invariant trước–sau; không mất event/thu tiền/hoàn tiền/tồn lặp.
- Có kết quả PASS/FAIL/NOT_RUN và evidence cho security, isolation, device, load. Lỗi chặn mua/tiền/dữ liệu/quyền phải sửa trước release.

Nếu mốc bàn giao trễ: giữ logic chưa đạt ở trạng thái rõ, không fixture fallback khi API lỗi, không tự chuyển issue Done hoặc đổi owner. Dời phần thiếu cùng dependency sang tuần sau theo [roadmap](roadmap.md); tiếp tục scope độc lập. Commit/PR viết tiếng Anh; dùng Refs nếu chưa hoàn thành toàn issue.
