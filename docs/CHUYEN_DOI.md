# Ghi nhận chuyển đổi tài liệu

Ngày chuyển đổi: 28/09/2026. Nguồn: `C:\PBL6\docs_old`. Đích: `C:\PBL6\docs\legacy`. Bản gốc được giữ nguyên.

## Ánh xạ và thống kê

| Nguồn | Markdown | Nội dung đã trích xuất |
| --- | --- | --- |
| SRS_v1.2.docx | [srs.md](legacy/srs.md) | 244 đoạn có nội dung và 37 bảng trong thân tài liệu |
| Use_Case_Specification (1).docx | [use-cases.md](legacy/use-cases.md) | 115 đoạn có nội dung và 44 bảng trong thân tài liệu |
| Functional_Requirements.xlsm | [functional-requirements.md](legacy/functional-requirements.md) | 2 sheet: 73 dòng/289 ô và 14 dòng/40 ô có nội dung |
| User_Story.xlsm | [user-stories.md](legacy/user-stories.md) | 1 sheet: 82 dòng/482 ô có nội dung, gồm 79 story |
| Phân chia việc.xlsx | [phan-cong.md](legacy/phan-cong.md) | 1 sheet: 5 dòng/10 ô có nội dung |

Thống kê đoạn Word không bao gồm các đoạn nằm trong bảng; chúng được bảo toàn trong bảng. Thống kê Excel bao gồm tiêu đề và hướng dẫn, không chỉ các dòng yêu cầu. Bỏ dòng hoàn toàn trống nhưng giữ nguyên số dòng gốc; các ô trống trong dòng được giữ nguyên. Không có công thức hoặc comment ô trong 4 sheet đã kiểm tra. Hai DOCX không chứa ảnh trong `word/media` nên không cần thư mục ảnh.

## Quy tắc chuyển đổi

- Mã hóa UTF-8, giữ tiếng Việt, mã yêu cầu, câu chữ, thứ tự đoạn và bảng.
- Chuyển heading Word thành heading Markdown; chuyển danh sách sang bullet hoặc danh sách số theo loại numbering của nguồn. Chuẩn hóa bắt đầu lại số bước cho từng danh sách riêng, không kéo dài số bước từ Use Case trước sang Use Case sau.
- Bảng được chuyển sang bảng Markdown; xuống dòng trong ô dùng `<br>`. Các ký tự có ý nghĩa đặc biệt được escape.
- Bảng Excel giữ chữ cái cột và thêm số dòng nguồn. Tên sheet, vùng gộp và ô đầu của vùng gộp được giữ để đối chiếu. Các ô được gộp không bị tự điền lặp dữ liệu.
- Mỗi file liên kết về nguồn và báo cáo rà soát. Bảng Word có anchor `table-N`; dòng Excel có anchor `sheet-N-row-M`.
- Không tự sửa nghiệp vụ, điền nội dung còn trống, đổi mức ưu tiên hoặc đổi phiên bản. Đề xuất chỉnh sửa nằm ở [RA_SOAT.md](RA_SOAT.md).

Markdown bảo toàn nội dung để đọc và chỉnh sửa, không tái tạo trang in, font, màu, kích thước cột, header/footer và phân trang Word/Excel. Không chuyển hoặc chạy macro VBA. Muốn xem bố cục hoặc tính năng ứng dụng gốc cần mở file trong `docs_old`.

## Kiểm tra

Đã đối chiếu các đoạn có nội dung và ô bảng Word, các giá trị ô Excel với nội dung Markdown sau escape; kiểm tra số bảng, số sheet và mã định danh. Đã kiểm tra liên kết file và các anchor được trích dẫn trong báo cáo. SHA-256 nguồn trước/sau chuyển đổi không thay đổi.

Hai nội dung trống đáng chú ý đã xác nhận trực tiếp ở nguồn: Use Case bảng 33 bước 3; SRS bảng 37 dòng Integration Testing. Các ô này được giữ trống để không che mất lỗi tài liệu.

| File nguồn | SHA-256 |
| --- | --- |
| SRS_v1.2.docx | `7fff3571bf1f825b9f906b21221b75e61b30a9d7536dadff0e7d950f8bd0e7eb` |
| Use_Case_Specification (1).docx | `5e2eec7d347befe0aed6d9242bf9a26f5f7e1a7f3a50c84902e3c91f6194b8de` |
| Functional_Requirements.xlsm | `7ba9e9cdf6ca107667a190a7e3712d1a6ae6cdcbf1e84389ddea684272d350c3` |
| User_Story.xlsm | `117adb2641602846e8cdb173d95cf289234b163e291333d7e07e1401fb82ec57` |
| Phân chia việc.xlsx | `050fbb5f6abe0f159407e7c4a85f6a9f8685365bb8254ebec2f5483691ec6b11` |

## Chuyển lại từ nguồn

Công cụ: [scripts/convert_docs.py](../scripts/convert_docs.py), dùng `python-docx` và `openpyxl` để đọc nguồn. Chạy bằng môi trường Python đã cài hai thư viện này:

```powershell
python .\scripts\convert_docs.py
```

Lệnh không ghi đè nếu đã có file; dùng `--force` để ghi lại 5 file chuyển đổi và in thống kê/SHA-256; không ghi đè README, báo cáo rà soát hoặc ghi nhận này. Khi đã bắt đầu sửa nghiệp vụ trực tiếp trên Markdown, cần sao lưu hoặc quản lý phiên bản trước khi chạy lại. Các thống kê/báo cáo cũng cần rà lại nếu nguồn thay đổi.
