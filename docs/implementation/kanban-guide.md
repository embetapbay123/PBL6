# Cách dùng Kanban của nhóm

[Mở bảng tổng theo member](https://github.com/users/embetapbay123/projects/1/views/3) hoặc [Kanban tiến độ](https://github.com/users/embetapbay123/projects/1/views/2). Toàn bộ71 task đã giao trước; xem [bảng scope đầy đủ](task-assignment.md). **Status trên Project là nguồn tiến độ duy nhất.** Kéo thẻ để đổi cột; mở issue trên thẻ để đọc phạm vi, dependency, reviewer và tiêu chí nghiệm thu.

## Các cột

| Cột | Khi nào dùng |
| --- | --- |
| Backlog | Task đã ghi, chờ chốt scope/phụ thuộc hoặc đợt tiếp theo |
| Todo | Có scope và tiêu chí; có thể bắt đầu phần việc đã xác định |
| In progress | Owner đang code; mỗi người tối đa một task |
| Review | Có PR, cách chạy và bằng chứng; chờ reviewer |
| Blocked | Ghi API/task đang chờ, người phụ trách và điều kiện mở chặn trong issue |
| Done | Đủ nghiệm thu, PR đã merge và issue đóng hoàn thành |

BE có thể làm repository/state machine bằng seed/adapter fixture, UI có thể làm page riêng theo contract/component mẫu trước API thật; tích hợp thật vẫn cần nghiệm thu. Không chuyển cả task sang Blocked nếu vẫn còn phần độc lập có thể làm. Status Done không thay bằng chứng triển khai API.

## Nhận và tạo task

| Member | GitHub | Số task theo scope |
| --- | --- | --- |
| Công | embetapbay123 | 14 |
| Thịnh | QT-2005 | 14 |
| Hoa | mimidangeiu | 18 |
| Trí | phantri1912 | 14 |
| Hatsaphone | HATSAPHONE | 11 |

- Bảng tổng nhóm theo **Owner**, cột theo **Status**. Owner là người thực hiện; Assignee là tài khoản GitHub. Cả4 member có quyền Write trên Project để tự kéo thẻ.
- Trí đã nhận lời mời repo và được gán14 task cho phantri1912. Hoa/Thịnh/Hatsaphone còn chờ nhận; đăng nhập đúng tài khoản và [chấp nhận lời mời](https://github.com/embetapbay123/PBL6/invitations) để push branch/nhận Assignee; trong lúc chờ, issue tạm giao embetapbay123 nhưng Owner vẫn là member. Sau khi nhận, chuyển các issue của Owner đó sang tài khoản tương ứng.
- Tất cả task đã có issue, cách bắt đầu và dependency nghiệm thu. Không chờ Công giao tiếp. Chọn task Todo phù hợp; có thể đưa task Backlog lên Todo khi đã hiểu scope và có đầu vào/fixture đủ để làm phần độc lập. Mỗi người tối đa một task In progress.
- **P0** ưu tiên contract/nền và luồng mua cốt lõi, **P1** nghiệp vụ/UI, **P2** nghiệm thu thiết bị/tải/recovery/demo. Priority không bắt cả nhóm làm tuần tự.
- Task mới ngoài scope hiện có dùng [mẫu issue](../../.github/ISSUE_TEMPLATE/member-task.md), thêm vào **PBL6 — Team Kanban**, chọn Owner/Status/Priority và Assignee. Reviewer/phối hợp ghi trong body; labels `task`, `owner:*`, `scope:*`, `phase:*` để lọc.

## Code và bàn giao

1. Nhận task: đọc scope/dependency, tạo branch theo issue, kéo sang In progress.
2. Có PR: ghi cách chạy và bằng chứng, dùng `Closes #N` khi PR hoàn thành toàn task, `Refs #N` nếu mới một phần; kéo sang Review.
3. Đủ nghiệm thu và PR merge: đóng issue với reason completed, chuyển thẻ sang Done. Nếu PR dùng `Closes #N`, GitHub đóng issue khi merge; kiểm Status trên board sau đó.
4. Task hủy: đóng với reason not_planned rồi archive thẻ; không tính Done. Task mở lại: đưa về Todo hoặc In progress theo thực tế.

Quy tắc nghiệm thu ở [verification plan](verification-plan.md), phạm vi dài hạn ở [backlog](member-backlog.md) và [bảng giao task](task-assignment.md).
