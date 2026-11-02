# Menu tài khoản và mật độ form — 2026-11-03

Đối chiếu pattern [Dropdown Menu](https://ui.shadcn.com/docs/components/dropdown-menu) và [Input](https://ui.shadcn.com/docs/components/input) của shadcn: nhóm điều hướng, separator, hành động đăng xuất ở cuối; chiều cao/spacing nhất quán. Giữ primitive và font hiện có, không thêm framework mới cho lượt sửa này.

- Menu có Đăng xuất trực tiếp qua auth API, chặn gửi lặp. Bản nháp chưa lưu có thể từ chối đăng xuất. Lỗi thu hồi server vẫn xóa phiên local và có thông báo qua lần remount phiên.
- Gỡ CSS `max-width:none` đang ghi đè `max-w-*`. Ô hồ sơ đo trước là 1060px; sau còn tối đa 624px, điện thoại tối đa 320px.
- Input desktop 40px, mobile 44px/font 16px; textarea giữ chiều cao riêng. Checkbox/radio không bị áp kiểu text input trong dialog.
- Bổ sung layout thật cho `market-form-grid`: hai cột desktop, một cột mobile; giới hạn form cấu hình Store, giá tiền ví dụ và email mời nhân viên. Sidebar/menu desktop gọn hơn.

Demo nhanh: chỉ build frontend, 5 ca Edge tập trung (logout thành công/lỗi/draft, 1440/390px) và kiểm tra các vùng form liên quan. Chỉ triển khai web; không build API/worker, backup, migration hoặc reset DB. Ảnh và số đo nằm trong `artifacts/account-density/`.
