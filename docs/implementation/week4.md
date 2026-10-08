# Week 4 — Staff, Review, report và recommendation

**Kế hoạch dự kiến**, cập nhật 06/10/2026; 5 ngày làm việc/tuần. [Roadmap toàn bộ](roadmap.md) quy định mốc, điều kiện và cách xử lý trễ; Status thực tế xem [Kanban](https://github.com/users/embetapbay123/projects/1/views/3). Task dưới đây gồm phần tiếp tục/kiểm lại, không có nghĩa mở lại scope đã Done.

## Kết quả cuối tuần

Hoàn thiện luồng vận hành Store/staff, Review hậu mua và recommendation có consent. Admin/Seller/Customer nhận dữ liệu nghiệp vụ thật thay cho số liệu giả.

## Việc từng người

| Owner | Issue | Phần làm tuần này | Mốc bàn giao |
| --- | --- | --- | --- |
| Công | [#55](https://github.com/embetapbay123/PBL6/issues/55), [#56](https://github.com/embetapbay123/PBL6/issues/56) | Train ALS + baseline/fallback, related/for-you và ProductChanged index. Chuẩn bị dataset/version/split theo thời gian; consent off dùng fallback chung, Product ẩn/Store khóa không lọt vào card. | Ngày 2 recommendation baseline chạy; ngày 4 ALS + related cho Web/Android. Thiếu dữ liệu phải có fallback hợp lệ và ghi rõ chất lượng. |
| Thịnh | [#12](https://github.com/embetapbay123/PBL6/issues/12), [#16](https://github.com/embetapbay123/PBL6/issues/16), [#18](https://github.com/embetapbay123/PBL6/issues/18), [#19](https://github.com/embetapbay123/PBL6/issues/19) | Taxonomy/attribute CRUD, Review sau mua qua eligibility M2; Seller staff/Store và Order/COD UI dùng M3/M2. Không tự ghi tiền hoặc quyền trong M1. | Ngày 2 taxonomy/review API; ngày 4 Seller Order/COD và staff nối thật. |
| Hoa | [#30](https://github.com/embetapbay123/PBL6/issues/30), [#32](https://github.com/embetapbay123/PBL6/issues/32), [#34](https://github.com/embetapbay123/PBL6/issues/34) | Report/dashboard lấy User/Store count M3 và low-stock M1; Android Catalog/recommendation, Order/Payment/Refund/Review. Phần AI metrics report bàn giao tuần 6, không coi report đã đủ chỉ vì có Order count. | Ngày 2 report lát cắt commerce; ngày 4 Android QR/poll/refund/review và recommendation. |
| Trí | [#42](https://github.com/embetapbay123/PBL6/issues/42), [#43](https://github.com/embetapbay123/PBL6/issues/43), [#48](https://github.com/embetapbay123/PBL6/issues/48) | Invitation accept/revoke/expiry/dedup, staff permission và context hiện hành; Admin Voucher/Order/dashboard. Nối report theo nguồn thật, phần AI metrics chờ tuần 6. | Ngày 2 staff/invitation cho Seller/Customer; ngày 4 Admin Voucher/Orders/report commerce. |
| Hatsaphone | [#68](https://github.com/embetapbay123/PBL6/issues/68), [#69](https://github.com/embetapbay123/PBL6/issues/69), [#71](https://github.com/embetapbay123/PBL6/issues/71) | QR Payment/polling/Refund status; Review read/write; consent + Store application/invitation UI. Nối từng lát cắt có API; không coi QR là đã trả tiền. | Ngày 3 Payment/Review; ngày 5 consent và Store application/invitation. |

File bắt đầu/API/checklist đầy đủ ở [bảng task](task-assignment.md) và README module trong issue. Với Payment/kho/AI dùng đúng [contract tích hợp](../integration-contract.md); không tạo contract riêng để vượt dependency.

## Handoff và lịch 5 ngày

M3 staff ngày 2 → Seller/Customer. M1 Review ngày 2 → Android/Web. M4 recommendation ngày 4 → Android; chat UI tuần 5. M2 report dùng dependency count/low-stock đã bàn giao.

1. Ngày 1: lấy main/CI mới, đối chiếu acceptance và phần tồn từ tuần trước; chọn một issue/nhánh chính, kiểm input/fixture và chốt lát cắt bàn giao.
2. Ngày 2: bàn giao API/lát cắt theo bảng cùng quyền, lỗi, ví dụ và test; consumer tích hợp ngay phần đã đạt.
3. Ngày 3: nối dependency thật, gửi PR nhỏ để review; ghi owner/operation đang chờ và tiếp tục phần độc lập.
4. Ngày 4: chạy integration/e2e và các case sai quyền, concurrency/retry phù hợp; sửa lỗi đúng owner.
5. Ngày 5: demo đầu ra tuần, cập nhật evidence/README/endpoint-status và issue/Kanban theo thực tế.

## Điều kiện nghiệm thu

- Chỉ OrderItem COMPLETED đủ điều kiện Review; Customer khác và Review trùng bị từ chối.
- Invitation hết hạn/replay/thu hồi và permission bị bỏ có test; Seller không đọc Store khác.
- Report đối chiếu fixture DB/ledger thật; recommendation lưu baseline/model metric sơ bộ, consent và card live được kiểm.

Nếu mốc bàn giao trễ: giữ logic chưa đạt ở trạng thái rõ, không fixture fallback khi API lỗi, không tự chuyển issue Done hoặc đổi owner. Dời phần thiếu cùng dependency sang tuần sau theo [roadmap](roadmap.md); tiếp tục scope độc lập. Commit/PR viết tiếng Anh; dùng Refs nếu chưa hoàn thành toàn issue.
