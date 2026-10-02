# Cách dùng Kanban của nhóm

Mở [board](kanban.md) hoặc [task trên GitHub](https://github.com/embetapbay123/PBL6/issues?q=is%3Aissue%20label%3Atask). Issue là nguồn dữ liệu; board Markdown được sinh từ issue, không sửa trạng thái trực tiếp trong file. Đây là Kanban đồng bộ từ Issues, chưa phải GitHub Projects kéo thả: kết nối hiện chỉ có quyền repo/workflow, thiếu quyền project.

## Các cột

| Cột | Khi nào dùng |
| --- | --- |
| Backlog | Task đã ghi nhưng chưa mở làm; cần chốt scope/phụ thuộc hoặc đang chờ đến đợt tiếp theo |
| Todo | Task đã giao, đọc được scope và tiêu chí; có thể bắt đầu phần việc đã xác định |
| In progress | Owner đang code; mỗi người tối đa một task ở cột này |
| Review | Có PR, cách chạy và bằng chứng nghiệm thu; đang chờ reviewer |
| Blocked | Không thể tiếp tục phần cần nghiệm thu; ghi API/task đang chờ, owner dependency và điều kiện mở chặn |
| Done | Đã demo/test đạt, PR đã merge; issue được đóng với reason completed |

Mỗi issue mở có **một** label `status:backlog`, `status:todo`, `status:in-progress`, `status:review` hoặc `status:blocked`. Khi đổi cột, mở issue → Labels → bỏ status cũ → chọn status mới. `status:done` là label dự phòng để dùng khi chuyển sang Projects; board hiện xác định Done từ trạng thái đóng hoàn thành của issue. Đóng vì không thực hiện dùng reason `not_planned`, không tính Done.

Task có thể phát triển bằng fixture trong lúc chờ API nếu đã ghi rõ phạm vi; phần tích hợp thật vẫn chưa nghiệm thu. Không chuyển cả task sang Blocked nếu vẫn còn phần độc lập có thể làm. Không đánh dấu API IMPLEMENTED vì task nhỏ đã Done.

## Giao người và mở việc

- `owner:cong`, `owner:hoa`, `owner:tri`, `owner:thinh`, `owner:hatsaphone` là người thực hiện theo phân công đã chốt. Mỗi task có đúng một owner; reviewer/phối hợp ghi trong body.
- Theo yêu cầu hiện tại, tất cả Assignee tạm là **embetapbay123**. Khi có username của member, đổi Assignee; không cần đổi owner nếu phân công không đổi.
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
