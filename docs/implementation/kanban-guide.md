# Cách dùng Kanban của nhóm

[Mở Kanban PBL6](https://github.com/users/embetapbay123/projects/1/views/2). **Status trên Project là nguồn tiến độ duy nhất.** Kéo thẻ để đổi cột; mở issue trên thẻ để đọc phạm vi, dependency, reviewer và tiêu chí nghiệm thu.

## Các cột

| Cột | Khi nào dùng |
| --- | --- |
| Backlog | Task đã ghi, chờ chốt scope/phụ thuộc hoặc đợt tiếp theo |
| Todo | Có scope và tiêu chí; có thể bắt đầu phần việc đã xác định |
| In progress | Owner đang code; mỗi người tối đa một task |
| Review | Có PR, cách chạy và bằng chứng; chờ reviewer |
| Blocked | Ghi API/task đang chờ, người phụ trách và điều kiện mở chặn trong issue |
| Done | Đủ nghiệm thu, PR đã merge và issue đóng hoàn thành |

Task có thể làm phần độc lập bằng fixture đúng contract khi đã ghi rõ; tích hợp thật vẫn cần nghiệm thu. Không chuyển cả task sang Blocked nếu vẫn còn phần độc lập có thể làm. Status Done không thay bằng chứng triển khai API.

## Nhận và tạo task

| Member | GitHub | Task hiện có |
| --- | --- | --- |
| Công | embetapbay123 | #1, #6 |
| Thịnh | QT-2005 | #2, #7 |
| Hoa | mimidangeiu | #3, #8 |
| Trí | Chưa có username | #4 |
| Hatsaphone | Chưa có username | #5 |

- Hoa/Thịnh đã được mời repo Write; cần [chấp nhận lời mời](https://github.com/embetapbay123/PBL6/invitations) để nhận Assignee và push branch. Trong lúc chờ, Assignee tạm là embetapbay123; Owner trên thẻ ghi người thực hiện. Sau khi chấp nhận, chuyển Assignee #2/#7 cho QT-2005 và #3/#8 cho mimidangeiu.
- Quyền Write của Project cho phép member đổi Status; quyền repo quản lý việc code/issue. Công quản lý Project và cấp quyền cho Trí/Hatsaphone khi có username.
- Tạo task bằng [mẫu issue](../../.github/ISSUE_TEMPLATE/member-task.md), thêm vào **PBL6 — Team Kanban** ở mục Projects của issue, chọn Status và ghi Owner. Chọn đúng một Assignee khi có tài khoản; reviewer/phối hợp ghi trong body. Label `task`, `owner:*`, `scope:*`, `phase:*` dùng để lọc việc.

## Code và bàn giao

1. Nhận task: đọc scope/dependency, tạo branch theo issue, kéo sang In progress.
2. Có PR: ghi cách chạy và bằng chứng, dùng `Closes #N` khi PR hoàn thành toàn task, `Refs #N` nếu mới một phần; kéo sang Review.
3. Đủ nghiệm thu và PR merge: đóng issue với reason completed, chuyển thẻ sang Done. Nếu PR dùng `Closes #N`, GitHub đóng issue khi merge; kiểm Status trên board sau đó.
4. Task hủy: đóng với reason not_planned rồi archive thẻ; không tính Done. Task mở lại: đưa về Todo hoặc In progress theo thực tế.

Quy tắc nghiệm thu ở [verification plan](verification-plan.md), phạm vi dài hạn ở [backlog](member-backlog.md) và [bảng giao task](task-assignment.md).
