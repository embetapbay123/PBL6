# -*- coding: utf-8 -*-
"""
Script to fix 6 specific issues across all 3 Excel files:
1. Hieu_Nang!K13 & O13 (PERF02): Unify Composite Index (store_id, category_id, status, created_at) and p95 = 1.820 ms.
2. Hieu_Nang!K16 & O16 (PERF06): Unify connection pool to 50 connections (TypeORM pool) and breakpoint 160 VU.
3. San_Pham_Kho!H15, K15, O15 (U33): Replace 'reason enum' with 'chuỗi lý do không rỗng, tối đa 200 ký tự'.
4. Don_Hang!H15 & O15 (U26): Fix to 'to_status=CONFIRMED (sai bước chuyển, chưa phải SHIPPED)' and separate carrier_name 120, tracking_code 200.
5. Thanh_Toan!O12 (U44): Fix to 'chữ ký HMAC và độ lệch timestamp vượt quá ±300 giây' (remove correlation ID mention).
6. Gio_Hang_Dat_Hang!H22 & O22 (W07): Describe both 100/101 items: render full 101 items and block checkout when selecting > 100 items per BR-01.
"""
import openpyxl

def fix_6_points(file_path):
    print(f"Applying 6 precision fixes to {file_path}...")
    wb = openpyxl.load_workbook(file_path)

    # -------------------------------------------------------------
    # 1. Hieu_Nang!K13 & O13 (PERF02)
    # -------------------------------------------------------------
    ws_hn = wb['Hieu_Nang']
    ws_hn['K13'].value = (
        "Tester: Nguyễn Minh Công\n\nROUND 2 (03/11/2026): PASSED.\n"
        "Chi tiết: Dev bổ sung Composite Index (store_id, category_id, status, created_at) trên bảng products; "
        "độ trễ tải hỗn hợp 100 VU p95 giảm từ 2.350ms xuống 1.820ms (< 2.000ms SLA), 0 lỗi 5xx. Re-test đạt."
    )
    ws_hn['O13'].value = (
        "Pass sau khi fix lỗi R1: Bổ sung Composite Index (store_id, category_id, status, created_at) trên PostgreSQL; "
        "độ trễ tải hỗn hợp 100 VU p95 giảm từ 2.350ms xuống 1.820ms (< 2.000ms SLA), không còn lỗi timeout."
    )
    print("  Fixed PERF02 (K13 & O13).")

    # -------------------------------------------------------------
    # 2. Hieu_Nang!K16 & O16 (PERF06)
    # -------------------------------------------------------------
    ws_hn['K16'].value = (
        "Tester: Nguyễn Minh Công\n\nROUND 2 (03/11/2026): PASSED.\n"
        "Chi tiết: Dev nâng connection pool TypeORM lên 50 kết nối và kích hoạt Redis keep-alive. "
        "Tải stress 120 VU không còn lỗi 502/cạn pool; điểm gãy hệ thống tăng lên 160 VU. Re-test đạt."
    )
    ws_hn['O16'].value = (
        "Pass sau khi fix lỗi R1: Nâng connection pool TypeORM lên 50 kết nối và kích hoạt Redis keep-alive; "
        "tải stress 120 VU không còn xuất hiện lỗi 502/cạn pool; điểm gãy hệ thống đạt 160 VU."
    )
    print("  Fixed PERF06 (K16 & O16).")

    # -------------------------------------------------------------
    # 3. San_Pham_Kho!H15, K15, O15 (U33)
    # -------------------------------------------------------------
    ws_spk = wb['San_Pham_Kho']
    ws_spk['H15'].value = (
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): FAILED.\n"
        "Chi tiết: Thiếu validate bắt buộc chuỗi lý do điều chỉnh kho: gửi chuỗi rỗng, chỉ có khoảng trắng "
        "hoặc vượt quá 200 ký tự vẫn được chấp nhận thay vì từ chối 422. Đã lập biên bản lỗi kỹ thuật chuyển Dev khắc phục."
    )
    ws_spk['K15'].value = (
        "Tester: Đặng Hoài Đức\n\nROUND 2 (03/11/2026): PASSED.\n"
        "Chi tiết: Dev bổ sung validation bắt buộc chuỗi lý do điều chỉnh kho không rỗng và tối đa 200 ký tự theo đúng constraint DTO. Re-test đạt 100%."
    )
    ws_spk['O15'].value = (
        "Pass sau khi fix lỗi R1: Bổ sung validation bắt buộc chuỗi lý do điều chỉnh kho không rỗng và tối đa 200 ký tự "
        "(chuỗi rỗng, chỉ có khoảng trắng hoặc > 200 ký tự trả về 422)."
    )
    print("  Fixed U33 (H15, K15, O15).")

    # -------------------------------------------------------------
    # 4. Don_Hang!H15 & O15 (U26)
    # -------------------------------------------------------------
    ws_dh = wb['Don_Hang']
    ws_dh['H15'].value = (
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Chuyển trạng thái đơn sang SHIPPED: carrier_name rỗng hoặc chỉ có khoảng trắng trả về 422 SHIPMENT_DETAILS_REQUIRED; "
        "carrier_name 121 ký tự trả 422, tracking_code 201 ký tự trả 422; độ dài hợp lệ (carrier_name 1-120 ký tự, tracking_code 1-200 ký tự) cập nhật thành công 200 OK; "
        "gửi thông tin shipment khi to_status=CONFIRMED (sai bước chuyển trạng thái) trả về đúng 422 SHIPMENT_INPUT_CONFLICT."
    )
    ws_dh['O15'].value = (
        "Pass: Bắt buộc thông tin vận chuyển khi chuyển sang SHIPPED: carrier_name tối đa 120 ký tự, tracking_code tối đa 200 ký tự "
        "(vượt giới hạn trả 422); gửi shipment khi to_status=CONFIRMED (sai bước chuyển) trả đúng 422 SHIPMENT_INPUT_CONFLICT."
    )
    print("  Fixed U26 (H15 & O15).")

    # -------------------------------------------------------------
    # 5. Thanh_Toan!O12 (U44)
    # -------------------------------------------------------------
    ws_tt = wb['Thanh_Toan']
    ws_tt['O12'].value = (
        "Pass: Webhook SePay sai chữ ký số HMAC-SHA256 hoặc độ lệch timestamp vượt quá ±300 giây bị từ chối với lỗi 401 INVALID_CALLBACK "
        "(so sánh timingSafeEqual); không thay đổi trạng thái đơn."
    )
    print("  Fixed U44 (O12).")

    # -------------------------------------------------------------
    # 6. Gio_Hang_Dat_Hang!H22 & O22 (W07)
    # -------------------------------------------------------------
    ws_cart = wb['Gio_Hang_Dat_Hang']
    ws_cart['H22'].value = (
        "Tester: Nguyễn Hà\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Kiểm thử giỏ hàng quy mô lớn: Playwright render thành công toàn bộ 101 dòng sản phẩm ban đầu đạt ~1.2s (< 3.0s timeout baseline); "
        "khi người dùng chọn tất cả (> 100 dòng) để thanh toán, giao diện lập tức hiển thị cảnh báo giới hạn tối đa 100 dòng theo BR-01 và chặn nút checkout, không gửi request 422 lên server."
    )
    ws_cart['O22'].value = (
        "Pass sau khi fix lỗi R2: Tối ưu giỏ hàng hiển thị đầy đủ 101 dòng bằng React.memo cho CartItemRow; "
        "chọn thanh toán > 100 dòng hiển thị cảnh báo giới hạn và chặn checkout theo BR-01, cuộn mượt mà 60fps."
    )
    print("  Fixed W07 (H22 & O22).")

    wb.save(file_path)
    print(f"Saved {file_path} successfully!")

if __name__ == '__main__':
    targets = [
        r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx',
        r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx',
        r'C:\Users\congh\Downloads\Test Report.xlsx'
    ]
    for t in targets:
        fix_6_points(t)
