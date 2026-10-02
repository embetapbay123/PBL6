---
name: Task thành viên
about: Giao một chức năng trên khung PBL6 với đầu ra và nghiệm thu rõ ràng
title: "[ID] Chức năng cần hoàn thiện"
labels: "task"
assignees: ""
---

## Người phụ trách

- Owner: một người; chọn Assignee tương ứng trên GitHub.
- Reviewer / người hỗ trợ:
- Branch dự kiến:
- Label owner (chọn đúng một): owner:cong / owner:hoa / owner:tri / owner:thinh / owner:hatsaphone.
- Project: PBL6 — Team Kanban; thêm issue vào Project và chọn Status = Backlog hoặc Todo.
- Owner trên Project: tên member; Priority: P0 (nền/luồng cốt lõi), P1 (nghiệp vụ/UI), P2 (nghiệm thu).

## Phạm vi và đầu ra

- Service / module hoặc màn hình:
- Operation ID / API:
- File / thư mục chính:
- Endpoint, page, migration, ví dụ cần bàn giao:
- Phần tách sang task tiếp theo:

## Phụ thuộc

- API / task phụ thuộc và owner:
- Trạng thái: đã nghiệm thu / sample / stub / chưa có contract.
- Cách phát triển trong lúc chờ: fixture đúng contract trong test hoặc môi trường mock có nhãn.
- Phần độc lập có thể bắt đầu ngay; không chờ công bố/giao các task khác:
- Điều kiện để nghiệm thu tích hợp thật:

## Tiêu chí nghiệm thu

- [ ] Luồng thành công có thể demo với dữ liệu đã ghi rõ.
- [ ] Input, quyền/ownership và lỗi phù hợp phạm vi được kiểm chứng.
- [ ] State/version/idempotency/recovery được kiểm nếu chức năng có yêu cầu.
- [ ] UI có loading/empty/error nếu task có màn hình.
- [ ] Contract/types/status/README được cập nhật nếu có thay đổi; không ghi hoàn thành toàn endpoint khi chỉ làm một phần.

## Bằng chứng và bàn giao

- Lệnh kiểm tra + kết quả:
- Request/response mẫu hoặc ảnh/video demo:
- Dữ liệu và cách tái hiện:
- Migration và bước chạy:
- PR:
- Lỗi/phụ thuộc còn tồn tại:
