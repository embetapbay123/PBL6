# Cách dùng Kanban của nhóm

Mở [GitHub Projects kéo thả](https://github.com/users/embetapbay123/projects/1/views/2), [bản Markdown](kanban.md) hoặc [task trên GitHub](https://github.com/embetapbay123/PBL6/issues?q=is%3Aissue%20label%3Atask). Project đã liên kết với repo và có đủ6 cột/8 task. Issue và label là nguồn trạng thái; bản Markdown tự cập nhật qua Actions, còn Project đồng bộ thủ công bằng lệnh bên dưới. Không sửa trạng thái trực tiếp trong file Markdown.

## Các cột

| Cột | Khi nào dùng |
| --- | --- |
| Backlog | Task đã ghi nhưng chưa mở làm; cần chốt scope/phụ thuộc hoặc đang chờ đến đợt tiếp theo |
| Todo | Task đã giao, đọc được scope và tiêu chí; có thể bắt đầu phần việc đã xác định |
| In progress | Owner đang code; mỗi người tối đa một task ở cột này |
| Review | Có PR, cách chạy và bằng chứng nghiệm thu; đang chờ reviewer |
| Blocked | Không thể tiếp tục phần cần nghiệm thu; ghi API/task đang chờ, owner dependency và điều kiện mở chặn |
| Done | Đã demo/test đạt, PR đã merge; issue được đóng với reason completed |

Mỗi issue mở có **một** label `status:backlog`, `status:todo`, `status:in-progress`, `status:review` hoặc `status:blocked`. Khi đổi cột, mở issue → Labels → bỏ status cũ → chọn status mới, rồi đồng bộ Project. Nếu kéo thẻ trên Project, cập nhật label tương ứng ngay trong issue; chỉ kéo thẻ không cập nhật label và bản Markdown. `status:done` là label dự phòng; Done được xác định từ issue đóng hoàn thành. Đóng vì không thực hiện dùng reason `not_planned`, không tính Done.

Task có thể phát triển bằng fixture trong lúc chờ API nếu đã ghi rõ phạm vi; phần tích hợp thật vẫn chưa nghiệm thu. Không chuyển cả task sang Blocked nếu vẫn còn phần độc lập có thể làm. Không đánh dấu API IMPLEMENTED vì task nhỏ đã Done.

## Giao người và mở việc

- `owner:cong`, `owner:hoa`, `owner:tri`, `owner:thinh`, `owner:hatsaphone` là người thực hiện theo phân công đã chốt. Mỗi task có đúng một owner; reviewer/phối hợp ghi trong body.
- Username đã xác nhận: **Thịnh = [QT-2005](https://github.com/QT-2005)**, **Hoa = [mimidangeiu](https://github.com/mimidangeiu)**, **Công = embetapbay123**. Trí/Hatsaphone chưa có username; xem mapping ở [github-project.json](github-project.json).
- Đã gửi lời mời quyền Write vào repo cho Hoa và Thịnh ngày02/10/2026. Tại thời điểm bàn giao, lời mời đang pending; hai member cần đăng nhập đúng tài khoản và chấp nhận ở [repo invitations](https://github.com/embetapbay123/PBL6/invitations). Assignee vẫn tạm **embetapbay123** cho đến khi GitHub cho phép giao.
- Sau khi chấp nhận, gán #2/#7 cho QT-2005, #3/#8 cho mimidangeiu và bỏ assignee tạm ở các issue đó. Owner/reviewer/tiêu chí không đổi. Trí/Hatsaphone vẫn giao tạm cho Công.
- Năm task đầu ở Todo: CORE-01, CAT-01, CART-01, ID-01, WEB-01. FLOW-01, CAT-QUOTE-01 và CART-02 ở Backlog. Chưa tự đánh dấu người nào đã bắt đầu code.
- Task đợt sau tạo bằng [mẫu issue](../../.github/ISSUE_TEMPLATE/member-task.md): ID/title, owner, scope/API/file, đầu ra, dependency, tiêu chí và bằng chứng. Thêm label `task`, một owner, một status; có thể thêm `scope:*` và `phase:*`.
- Quy tắc cụ thể và roadmap nằm trong [bảng giao task](task-assignment.md), phạm vi dài hạn ở [backlog](member-backlog.md).

## PR và cập nhật

Owner tạo branch theo task, mở PR có `Closes #N` và mô tả bằng chứng. Đổi label sang Review khi có PR; reviewer kiểm theo [verification plan](verification-plan.md). Chỉ merge khi đủ scope/tiêu chí; một task nhiều PR chỉ đóng sau PR cuối đã đủ nghiệm thu. Nếu chưa đủ, ghi `Refs #N` để tránh tự đóng sớm.

Workflow [Sync task Kanban](https://github.com/embetapbay123/PBL6/actions/workflows/kanban.yml) chạy khi issue/label/assignee thay đổi hoặc chạy thủ công. Bot chỉ commit `docs/implementation/kanban.md`; không sửa code, không tự thực hiện task hoặc nâng trạng thái endpoint. Bảng có thể trễ trong lúc workflow đang chạy; issue luôn là nguồn hiện hành. Nếu sync lỗi, xem Actions và chạy lại; không dùng bản board cũ để suy ra API đã sẵn sàng.

Chạy đồng bộ local cho repo public:

```powershell
python scripts/sync_kanban.py
npm run docs:check
```

CI dùng GITHUB_TOKEN của repo, không cần đưa token cá nhân vào Git. Script chỉ đọc GitHub Issues và ghi board; có `--input` để kiểm với snapshot JSON offline. Phân công/tiêu chí không được ghi đè khi đồng bộ.

## Đồng bộ GitHub Projects

Công chạy trên máy đã đăng nhập GitHub CLI với quyền `project`:

```powershell
python scripts/sync_project.py --dry-run
python scripts/sync_project.py
```

Lệnh đọc issue có label `task`, kiểm mỗi task có một owner/status hợp lệ, thêm issue còn thiếu vào Project và cập nhật Status/Owner. Chạy lại khi không đổi dữ liệu không phát sinh mutation. Lệnh không tạo issue, mời người, thay Assignee hoặc đóng task; task `not_planned` bị bỏ qua, thẻ cũ nếu có cần archive thủ công. Tài khoản/Assignee trên thẻ issue do GitHub hiển thị trực tiếp; field Owner ghi người thực hiện kể cả khi lời mời chưa được nhận.

Project và README công khai cùng repo. Repo Write cho phép sửa issue/push branch; quyền sửa Project được quản lý riêng bởi Công. Actions hiện chỉ đồng bộ Markdown, không tự đồng bộ Project và không lưu token cá nhân trong repo. Sau khi merge PR/đổi label/tạo task, Công chạy lệnh sync để Project cập nhật. Nếu kéo thẻ nhưng chưa sửa issue, lần sync sau sẽ đưa thẻ về trạng thái từ issue. Không kéo Done để thay việc nghiệm thu/đóng issue.
