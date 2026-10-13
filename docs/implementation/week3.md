# Week 3 — Online Payment, hủy/hoàn và màn mua hàng

**Kế hoạch hiện hành**, cập nhật **13/10/2026**; 5 ngày làm việc từ khi nhóm bắt đầu Week 3, không gán ngày kết thúc lịch chưa được chốt. [Roadmap](roadmap.md) giữ Week 6 đủ chức năng/Week 8 bàn giao là dự kiến, đánh giá lại sau demo tuần này. [Kanban](https://github.com/users/embetapbay123/projects/1/views/3) là trạng thái sống; [bảng kiểm](week3-kanban-audit.md) ghi thay đổi lần này. Không mở lại scope đã Done.

## Đầu vào và phần tồn cần xử lý trước

- M1 reserve/consume/release, public Catalog và inventory/low-stock backend đã merge #98/#99/#100/#102. #7/#11/#14 Done; #13 còn Seller UI; Restock #15 chưa triển khai.
- M2 Cart/Voucher CRUD/Order read/transition và Payment create/COD đã có. **Confirm #22 và Cancel #24 vẫn trả 501; Voucher lifecycle #29 còn thiếu.** Hoàn thành phần tồn Week 2 trước demo mua/hủy thật.
- Hoa có 4 task Done và 6 Review; đọc [bảng xác minh](hoa-task-status.md), không làm lại CRUD/read/COD đã có. Review còn cần evidence, không phải Done.
- PR #101 của Trí đóng chưa merge; [PR #103](https://github.com/embetapbay123/PBL6/pull/103) hiện CHANGES_REQUESTED. Sửa Store UPDATE response, review response, concurrent application và các điểm Auth/RBAC còn lại; đồng bộ main trước nghiệm thu. CI xanh không thay review.
- Customer Web có list/detail/Cart/Checkout thật. Seller/Admin còn placeholder ngoài mẫu Product edit; giao diện `?mode=mock` có sẵn không tính là màn nghiệp vụ mới đã tích hợp.
- Công đã bàn giao callback persistence, Refund kernel và M4 adapters. Refund provider disabled/model none còn giới hạn rõ; pending/fallback không chứng minh đã hoàn tiền hoặc model đạt chất lượng.

## Kết quả cuối tuần

Ưu tiên demo COD từ Cart → quote → confirm nhóm Order/Payment → consume → xử lý/thu COD; tiếp Cancel/recovery từng Order. Online callback/Refund chỉ nghiệm thu thành công khi có provider test và toàn bộ điểm nối đạt. Product/Variant/image là mốc mở rộng sau handoff kho, không để phần này chặn sửa Confirm. Nếu gate COD chưa đạt, ghi rõ phần thiếu và đánh giá lại mốc Week 4.

## Việc từng người

| Owner | Issue | Phần làm tuần này | Mốc bàn giao |
| --- | --- | --- | --- |
| Công | [#52](https://github.com/embetapbay123/PBL6/issues/52) → [#53](https://github.com/embetapbay123/PBL6/issues/53), tiếp [#55](https://github.com/embetapbay123/PBL6/issues/55) | Nối callback follow-up với Hoa; Refund/provider test/reconcile. PAY-01/PAY-04 đã Done. Tracking M1 search/view và M2 cart/purchase/consent. #60 chỉ lấy sau khi Confirm/Cancel đủ để kiểm toàn luồng. | Ngày 2 callback/recovery handoff; ngày 3 Refund/retry tests và chốt cấu hình provider. Pending/UNKNOWN không phải thành công. |
| Thịnh | [#13](https://github.com/embetapbay123/PBL6/issues/13) + [#15](https://github.com/embetapbay123/PBL6/issues/15) → [#2](https://github.com/embetapbay123/PBL6/issues/2) | Seller inventory UI; RestockOrder/expiry/recovery cho Hoa; Store Product list. #9/#10 lấy sau handoff kho đạt và còn năng lực, giữ Backlog. | Ngày 2 restock replay/concurrency/rollback; ngày 4 Seller list/adjustment/movement thật. Create/Variant/image là mốc mở rộng. |
| Hoa | [#21](https://github.com/embetapbay123/PBL6/issues/21) → [#22](https://github.com/embetapbay123/PBL6/issues/22) + [#29](https://github.com/embetapbay123/PBL6/issues/29) → [#24](https://github.com/embetapbay123/PBL6/issues/24) | Quote invalidation, persisted orchestration, atomic group/quota, rồi Cancel/expiry. Nghiệm thu Review #23/#25/#27 độc lập với Confirm; #30/#31/#33 sau dependency thật. #32 giữ Backlog. | Ngày 2 PR Confirm lát cắt có test; ngày 3 gate COD group thật; ngày 5 cancel/recovery và Android nếu backend đạt. |
| Trí | Sửa [PR #103](https://github.com/embetapbay123/PBL6/pull/103): [#37](https://github.com/embetapbay123/PBL6/issues/37)/[#38](https://github.com/embetapbay123/PBL6/issues/38)/[#40](https://github.com/embetapbay123/PBL6/issues/40)/[#41](https://github.com/embetapbay123/PBL6/issues/41)/[#44](https://github.com/embetapbay123/PBL6/issues/44) | Chốt một nhánh chính, giữ thẻ đang active. Store response/concurrency, email delivery, effective permissions và event schemas. #39 Review; #46 Admin UI chỉ lấy sau API đạt, vẫn Backlog. | Ngày 2 PostgreSQL/HTTP review regressions; ngày 3 Auth/Admin User/Store totals cho report nếu đạt; ngày 5 khóa/revoke có hiệu lực trên token cũ. |
| Hatsaphone | [#65](https://github.com/embetapbay123/PBL6/issues/65)/[#66](https://github.com/embetapbay123/PBL6/issues/66) → [#64](https://github.com/embetapbay123/PBL6/issues/64), [#63](https://github.com/embetapbay123/PBL6/issues/63), [#67](https://github.com/embetapbay123/PBL6/issues/67) | Cart title/giá/Variant UX, checkout Voucher/Payment/attempt reload; Profile/Address thật; Auth forms; Order read với seed, nối Cancel khi #24 đạt. #5 list chuyển Review, không làm lại scaffold. | Ngày 2 Cart/Profile PR; ngày 3 Order read/loading/error/401/404; ngày 5 checkout/cancel thật nếu backend đạt. |

File bắt đầu/API/checklist đầy đủ ở [bảng task](task-assignment.md) và README module trong issue. Với Payment/kho/AI dùng đúng [contract tích hợp](../integration-contract.md); không tạo contract riêng để vượt dependency.

## Handoff và lịch 5 ngày

M1 reserve + Payment create đã có → Hoa Confirm/quota → COD gate → M1 restock + M2 Refund → Hoa Cancel → Web/Android. M3 Auth/Admin/Store → client forms/report. Giữ implementation đúng owner; consumer dùng seed/fixture dev chọn rõ cho phần độc lập, không dùng fixture làm bằng chứng giao dịch.

1. Ngày 1: lấy main/CI mới, đối chiếu acceptance và phần tồn từ tuần trước; chọn một issue/nhánh chính, kiểm input/fixture và chốt lát cắt bàn giao.
2. Ngày 2: bàn giao API/lát cắt theo bảng cùng quyền, lỗi, ví dụ và test; consumer tích hợp ngay phần đã đạt.
3. Ngày 3: gate COD thật: reserve → atomic group Order/Payment/quota → consume → đọc đúng state. Gate chưa đạt thì chưa đạt milestone mua/hủy; consumer tiếp tục read/forms/error states, ghi owner/operation đang chờ.
4. Ngày 4: integration/e2e Cancel/release/restock/Refund, consume fail và restart. Online/Refund thành công chỉ kiểm khi provider test được cấu hình; thiếu provider phải ghi giới hạn rõ.
5. Ngày 5: demo đầu ra tuần, cập nhật evidence/README/endpoint-status và issue/Kanban theo thực tế.

## Điều kiện nghiệm thu

- Callback duplicate/out-of-order/sai chữ ký/sai amount và callback muộn có bằng chứng; không thu/hoàn hai lần.
- Cancel trước/sau consume dùng đúng release/restock/refund; restart worker tiếp tục được. BR-40 không trả lại lượt Voucher đã chốt hoặc tính lại Order anh em.
- Seller tạo Product/Variant/ảnh thật, Customer mua từ dữ liệu mới; Android và Web chạy cùng backend.

Nếu mốc bàn giao trễ: giữ logic chưa đạt ở trạng thái rõ, không fixture fallback khi API lỗi, không tự chuyển issue Done hoặc đổi owner. Dời phần thiếu cùng dependency sang tuần sau theo [roadmap](roadmap.md); tiếp tục scope độc lập. Commit/PR viết tiếng Anh; dùng Refs nếu chưa hoàn thành toàn issue.

## Cập nhật Kanban tuần này

Chỉ 6 task mới chuyển Backlog → Todo: **#2/#15/#24/#53/#63/#67**. #5 chuyển Todo → Review vì API list/search/pagination và trạng thái UI đã có, còn nghiệm thu bố cục/evidence. Giữ 6 Review của Hoa và toàn bộ thẻ đang In progress. #9/#10/#32/#46/#60 cùng task tuần sau còn Backlog đến khi có năng lực/dependency. Không tự kéo Todo sang In progress, không đổi owner, không nâng endpoint metadata chỉ từ chuyển thẻ.
