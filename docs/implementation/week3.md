# Week 3 — Online Payment, hủy/hoàn và màn mua hàng

**Kế hoạch dự kiến**, cập nhật 06/10/2026; 5 ngày làm việc/tuần. [Roadmap toàn bộ](roadmap.md) quy định mốc, điều kiện và cách xử lý trễ; Status thực tế xem [Kanban](https://github.com/users/embetapbay123/projects/1/views/3). Task dưới đây gồm phần tiếp tục/kiểm lại, không có nghĩa mở lại scope đã Done.

## Kết quả cuối tuần

Bên cạnh COD, demo thanh toán SePay Test/sandbox từ callback thật của môi trường test, hủy Order và Refund/recovery theo từng Order. Hoàn thiện Product/Variant để không phụ thuộc dữ liệu seed khi tạo hàng.

## Việc từng người

| Owner | Issue | Phần làm tuần này | Mốc bàn giao |
| --- | --- | --- | --- |
| Công | [#51](https://github.com/embetapbay123/PBL6/issues/51), [#52](https://github.com/embetapbay123/PBL6/issues/52), [#53](https://github.com/embetapbay123/PBL6/issues/53), [#60](https://github.com/embetapbay123/PBL6/issues/60) | Chốt PaymentAttempt/reference; callback raw-body signature/dedup/amount; Refund và reconciliation. Timeout giữ UNKNOWN, callback muộn và consume lỗi có recovery bền vững. | Ngày 2 bàn giao callback/Payment read; ngày 3 Refund contract + implementation lát cắt cho Hoa/UI. |
| Thịnh | [#2](https://github.com/embetapbay123/PBL6/issues/2), [#9](https://github.com/embetapbay123/PBL6/issues/9), [#10](https://github.com/embetapbay123/PBL6/issues/10), [#15](https://github.com/embetapbay123/PBL6/issues/15) | Seller Product list/create/update, Variant/SKU/image; RestockOrder và expiry worker. Khóa/version/unique SKU và replay restock không lặp hiệu ứng. | Ngày 2 restock chạy được; ngày 4 Seller tạo Product có Variant/ảnh và tồn để mua. |
| Hoa | [#23](https://github.com/embetapbay123/PBL6/issues/23), [#24](https://github.com/embetapbay123/PBL6/issues/24), [#27](https://github.com/embetapbay123/PBL6/issues/27), [#31](https://github.com/embetapbay123/PBL6/issues/31), [#32](https://github.com/embetapbay123/PBL6/issues/32), [#33](https://github.com/embetapbay123/PBL6/issues/33) | Chốt Order read/Store Voucher acceptance; nối hủy với release/restock/Refund đúng state. Hoàn thiện Android Auth và COD checkout; Catalog Android tiếp tục sang tuần 4. | Ngày 3 hủy một Order trong nhóm không tác động Order khác; ngày 5 Android đặt/hủy thật. |
| Trí | [#39](https://github.com/embetapbay123/PBL6/issues/39), [#40](https://github.com/embetapbay123/PBL6/issues/40), [#41](https://github.com/embetapbay123/PBL6/issues/41), [#44](https://github.com/embetapbay123/PBL6/issues/44), [#46](https://github.com/embetapbay123/PBL6/issues/46) | Chốt session/RBAC; StoreApplication/review, Owner Store/ActiveStores; Admin User/Store/role UI. Store bị khóa và revoke membership có hiệu lực trên token cũ. | Ngày 2 Store apply/review; ngày 3 Admin APIs/count cho report và Seller. |
| Hatsaphone | [#63](https://github.com/embetapbay123/PBL6/issues/63), [#66](https://github.com/embetapbay123/PBL6/issues/66), [#67](https://github.com/embetapbay123/PBL6/issues/67) | Nối Auth forms với Trí; checkout COD nhiều Store và Order list/detail/cancel. Giữ attempt key qua retry, lỗi 409/501/503 không mở success. | Ngày 3 checkout thật; ngày 5 Customer Web đặt, xem và hủy Order. |

File bắt đầu/API/checklist đầy đủ ở [bảng task](task-assignment.md) và README module trong issue. Với Payment/kho/AI dùng đúng [contract tích hợp](../integration-contract.md); không tạo contract riêng để vượt dependency.

## Handoff và lịch 5 ngày

M1 restock + M2 Refund → Hoa cancel → Web/Android. M3 Auth/Store → client forms. Trí hoàn thiện M3 riêng, không sửa Payment hoặc Catalog.

1. Ngày 1: lấy main/CI mới, đối chiếu acceptance và phần tồn từ tuần trước; chọn một issue/nhánh chính, kiểm input/fixture và chốt lát cắt bàn giao.
2. Ngày 2: bàn giao API/lát cắt theo bảng cùng quyền, lỗi, ví dụ và test; consumer tích hợp ngay phần đã đạt.
3. Ngày 3: nối dependency thật, gửi PR nhỏ để review; ghi owner/operation đang chờ và tiếp tục phần độc lập.
4. Ngày 4: chạy integration/e2e và các case sai quyền, concurrency/retry phù hợp; sửa lỗi đúng owner.
5. Ngày 5: demo đầu ra tuần, cập nhật evidence/README/endpoint-status và issue/Kanban theo thực tế.

## Điều kiện nghiệm thu

- Callback duplicate/out-of-order/sai chữ ký/sai amount và callback muộn có bằng chứng; không thu/hoàn hai lần.
- Cancel trước/sau consume dùng đúng release/restock/refund; restart worker tiếp tục được. BR-40 không trả lại lượt Voucher đã chốt hoặc tính lại Order anh em.
- Seller tạo Product/Variant/ảnh thật, Customer mua từ dữ liệu mới; Android và Web chạy cùng backend.

Nếu mốc bàn giao trễ: giữ logic chưa đạt ở trạng thái rõ, không fixture fallback khi API lỗi, không tự chuyển issue Done hoặc đổi owner. Dời phần thiếu cùng dependency sang tuần sau theo [roadmap](roadmap.md); tiếp tục scope độc lập. Commit/PR viết tiếng Anh; dùng Refs nếu chưa hoàn thành toàn issue.
