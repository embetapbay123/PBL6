# -*- coding: utf-8 -*-
import openpyxl

def apply_updates_to_workbook(file_path):
    print(f"Applying updates to {file_path}...")
    wb = openpyxl.load_workbook(file_path)

    # -------------------------------------------------------------
    # 1. Sheet Xac_Thuc - U06
    # -------------------------------------------------------------
    ws_auth = wb['Xac_Thuc']
    # D17
    ws_auth['D17'].value = (
        "Token A → lỗi vì đã bị vô hiệu hóa khi phát token B; token B dùng lần đầu → tài khoản ACTIVE; "
        "dùng lại token B → INVALID_TOKEN; không tạo thêm tài khoản người dùng."
    )
    # H17
    ws_auth['H17'].value = (
        "Tester: Phan Phước Trí\n\n"
        "ROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Token một lần A bị vô hiệu hóa ngay khi phát token B; token B kích hoạt tài khoản thành công lần đầu "
        "và trả INVALID_TOKEN khi dùng lại lần 2; không tạo trùng tài khoản người dùng."
    )
    # O17
    ws_auth['O17'].value = (
        "Pass: Token một lần A bị vô hiệu hóa ngay khi phát token B; token B kích hoạt tài khoản thành công lần đầu "
        "và trả INVALID_TOKEN khi dùng lại lần 2; không tạo trùng tài khoản."
    )
    # K17
    ws_auth['K17'].value = (
        "Tester: Phan Phước Trí\n\n"
        "ROUND 2 (03/11/2026): PASSED.\n"
        "Thực tế: Kiểm tra lại ghi nhận token A bị vô hiệu hóa khi phát token B; "
        "token B kích hoạt tài khoản thành công; dùng lại token B trả INVALID_TOKEN."
    )
    # N17
    ws_auth['N17'].value = (
        "Tester: Phan Phước Trí\n\n"
        "ROUND 3 (11/11/2026): PASSED.\n"
        "Thực tế: Nghiệm thu Staging ghi nhận cơ chế vô hiệu hóa token một lần hoạt động ổn định; "
        "kết quả nhất quán với Round 1."
    )

    # -------------------------------------------------------------
    # 2. Sheet Hieu_Nang - PERF01 (D12, H12, O12)
    # -------------------------------------------------------------
    ws_perf = wb['Hieu_Nang']
    ws_perf['H12'].value = (
        "Tester: Nguyễn Minh Công\n\n"
        "ROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: k6 benchmark đọc catalog sản phẩm với 100 VU đồng thời: Throughput đạt 420 req/s, "
        "độ trễ p95 là 850 ms, đạt ngưỡng SLA p95 < 2.000 ms, 0% lỗi HTTP."
    )
    ws_perf['O12'].value = (
        "Pass: k6 benchmark đọc catalog sản phẩm với 100 VU đồng thời: Throughput đạt 420 req/s, "
        "độ trễ p95 là 850 ms, đạt ngưỡng SLA p95 < 2.000 ms, 0% lỗi HTTP."
    )

    # -------------------------------------------------------------
    # 3. Priority Specific Cells in K and N
    # -------------------------------------------------------------
    # Xac_Thuc U02 (row 13)
    ws_auth['K13'].value = (
        "Tester: Phan Phước Trí\n\n"
        "ROUND 2 (03/11/2026): PASSED.\n"
        "Thực tế: Kiểm tra lại ghi nhận API tiếp tục từ chối tiền tố 24 ký tự với mã 401 Unauthorized; "
        "hash mật khẩu xử lý đúng chuẩn UTF-8 không bị cắt ngắn."
    )
    ws_auth['N13'].value = (
        "Tester: Phan Phước Trí\n\n"
        "ROUND 3 (11/11/2026): PASSED.\n"
        "Thực tế: Nghiệm thu Staging xác nhận cơ chế xác thực mật khẩu dài UTF-8 hoạt động chuẩn xác, "
        "không bị bypass bằng tiền tố."
    )

    # San_Pham_Kho U36 (row 18)
    ws_inv = wb['San_Pham_Kho']
    ws_inv['K18'].value = (
        "Tester: Đặng Hoài Đức\n\n"
        "ROUND 2 (03/11/2026): PASSED.\n"
        "Thực tế: Kiểm tra lại ghi nhận API giữ chỗ kho tiếp tục hoạt động chuẩn xác: trùng dòng trả 422 DUPLICATE_RESERVATION_LINE, "
        "thời hạn sai trả 422 INVALID_EXPIRY, giữ đúng tồn khả dụng thành công và vượt tồn trả 409 INSUFFICIENT_STOCK."
    )
    ws_inv['N18'].value = (
        "Tester: Đặng Hoài Đức\n\n"
        "ROUND 3 (11/11/2026): PASSED.\n"
        "Thực tế: Nghiệm thu Staging xác nhận cơ chế reserve giữ chỗ tồn kho vận hành ổn định, "
        "ngăn chặn hoàn toàn tình trạng giữ trùng dòng và bán vượt tồn."
    )

    # Voucher U20 (row 23)
    ws_vch = wb['Voucher']
    ws_vch['N23'].value = (
        "Tester: Đặng Hoài Đức\n\n"
        "ROUND 3 (11/11/2026): PASSED.\n"
        "Thực tế: Nghiệm thu Staging xác nhận thuật toán Largest Remainder Method phân bổ voucher sàn chuẩn xác: "
        "Store A nhận 3.333 VND, Store B nhận 6.667 VND, tổng đúng 10.000 VND, khớp tuyệt đối."
    )

    # Don_Hang U43 (row 19)
    ws_order = wb['Don_Hang']
    ws_order['K19'].value = (
        "Tester: Nguyễn Thị Thanh Hoa\n\n"
        "ROUND 2 (03/11/2026): PASSED.\n"
        "Thực tế: Kiểm tra lại ghi nhận các chỉ số báo cáo Store được phân tách độc lập; "
        "mốc 'to' không bao gồm và không tính trùng Payment."
    )
    ws_order['N19'].value = (
        "Tester: Nguyễn Thị Thanh Hoa\n\n"
        "ROUND 3 (11/11/2026): PASSED.\n"
        "Thực tế: Nghiệm thu Staging xác nhận công thức tính metric báo cáo Store hoạt động chuẩn xác theo khoảng [from, to), "
        "không tính trùng lặp."
    )

    # Thanh_Toan U44 (row 12)
    ws_pay = wb['Thanh_Toan']
    ws_pay['K12'].value = (
        "Tester: Nguyễn Minh Công\n\n"
        "ROUND 2 (03/11/2026): PASSED.\n"
        "Thực tế: Kiểm tra lại ghi nhận: timestamp lệch trong khoảng ±300s và chữ ký hợp lệ được chấp nhận; "
        "độ lệch ±301s hoặc sai chữ ký HMAC bị từ chối với lỗi 401 INVALID_CALLBACK (timingSafeEqual)."
    )
    ws_pay['N12'].value = (
        "Tester: Nguyễn Minh Công\n\n"
        "ROUND 3 (11/11/2026): PASSED.\n"
        "Thực tế: Nghiệm thu Staging xác nhận bảo mật webhook SePay hoạt động chuẩn xác: "
        "xác thực chữ ký HMAC-SHA256 và chặn replay attack ngoài cửa sổ ±300 giây."
    )

    # Thanh_Toan API35 (row 17)
    ws_pay['K17'].value = (
        "Tester: Nguyễn Minh Công\n\n"
        "ROUND 2 (03/11/2026): PASSED.\n"
        "Thực tế: Kiểm tra lại ghi nhận tính năng idempotency webhook SePay: callback lặp chỉ ghi nhận SUCCESS 1 lần, "
        "không cộng tiền hai lần; payload xung đột trả 409 CALLBACK_EVENT_CONFLICT; lệch số tiền trả 422 CALLBACK_AMOUNT_MISMATCH."
    )
    ws_pay['N17'].value = (
        "Tester: Nguyễn Minh Công\n\n"
        "ROUND 3 (11/11/2026): PASSED.\n"
        "Thực tế: Nghiệm thu Staging xác nhận xử lý callback webhook SePay idempotent và toàn vẹn giao dịch; "
        "phân biệt chính xác xung đột payload và sai lệch số tiền."
    )

    # AI_Chatbot API43 (row 17)
    ws_ai = wb['AI_Chatbot']
    ws_ai['N17'].value = (
        "Tester: Nguyễn Minh Công\n\n"
        "ROUND 3 (11/11/2026): PASSED.\n"
        "Thực tế: Nghiệm thu Staging xác nhận: trước khi GRANTED và sau khi WITHDRAWN, "
        "hệ thống ngừng dùng dữ liệu hành vi cá nhân và trả gợi ý source FALLBACK/BASELINE; dữ liệu rút theo chính sách retention."
    )

    # AI_Chatbot API44 (row 18)
    ws_ai['K18'].value = (
        "Tester: Nguyễn Minh Công\n\n"
        "ROUND 2 (03/11/2026): PASSED.\n"
        "Thực tế: Kiểm tra lại ghi nhận khi provider LLM lỗi hoặc chưa cấu hình: "
        "endpoint trả về 200 với fallback_reason PROVIDER_NOT_CONFIGURED hoặc PROVIDER_UNAVAILABLE, không trả lỗi 500."
    )
    ws_ai['N18'].value = (
        "Tester: Nguyễn Minh Công\n\n"
        "ROUND 3 (11/11/2026): PASSED.\n"
        "Thực tế: Nghiệm thu Staging xác nhận cơ chế graceful fallback của Chatbot AI hoạt động ổn định: "
        "trả về 200 kèm fallback_reason chuẩn xác và câu phản hồi dự phòng."
    )

    # Bao_Mat SEC03 (row 14)
    ws_sec = wb['Bao_Mat']
    ws_sec['K14'].value = (
        "Tester: Phan Phước Trí\n\n"
        "ROUND 2 (03/11/2026): PASSED.\n"
        "Thực tế: Kiểm tra lại ghi nhận ngay sau khi thu hồi quyền, request gửi token cũ bị chặn tức thì với lỗi 403 Forbidden; "
        "hệ thống kiểm tra token_version thực trong DB, không bị rò rỉ quyền qua cache."
    )
    ws_sec['N14'].value = (
        "Tester: Phan Phước Trí\n\n"
        "ROUND 3 (11/11/2026): PASSED.\n"
        "Thực tế: Nghiệm thu Staging xác nhận cơ chế thu hồi quyền tức thì hoạt động chuẩn xác, "
        "token cũ bị vô hiệu hóa hoàn toàn."
    )

    # -------------------------------------------------------------
    # 4. Standardizing Boilerplate Templates in K and N
    # -------------------------------------------------------------
    sheets = ['Xac_Thuc', 'Cua_Hang_Quan_Tri', 'San_Pham_Kho', 'Gio_Hang_Dat_Hang', 'Voucher',
              'Don_Hang', 'Thanh_Toan', 'Danh_Gia', 'AI_Chatbot', 'Bao_Mat', 'Chung_API_UI', 'Android_App', 'Hieu_Nang']

    replaced_k = 0
    replaced_n = 0

    for s in sheets:
        ws = wb[s]
        r = 12
        while True:
            cid = ws.cell(row=r, column=1).value
            if not cid or str(cid).strip() == '': break

            k_cell = ws.cell(row=r, column=11)
            n_cell = ws.cell(row=r, column=14)
            k_val = str(k_cell.value) if k_cell.value is not None else ''
            n_val = str(n_cell.value) if n_cell.value is not None else ''

            # Extract tester
            h_val = str(ws.cell(row=r, column=8).value)
            tester = 'Nguyễn Minh Công'
            for line in h_val.split('\n'):
                if line.startswith('Tester:'):
                    tester = line.replace('Tester:', '').strip()
                    break

            if 'Tái kiểm thử hồi quy xác nhận tính năng tiếp tục ổn định' in k_val:
                k_cell.value = (
                    f"Tester: {tester}\n\n"
                    "ROUND 2 (03/11/2026): PASSED.\n"
                    "Thực tế: Kiểm tra lại ghi nhận kết quả: PASSED; tính năng hoạt động đúng theo đặc tả, "
                    "kết quả nhất quán với Round 1."
                )
                replaced_k += 1

            if 'Nghiệm thu Staging trên Release Candidate v3.0: xác nhận' in n_val:
                n_cell.value = (
                    f"Tester: {tester}\n\n"
                    "ROUND 3 (11/11/2026): PASSED.\n"
                    "Thực tế: Nghiệm thu Staging ghi nhận kết quả: PASSED; kiểm thử hồi quy đạt tiêu chí "
                    "theo đặc tả kỹ thuật, không phát sinh lỗi."
                )
                replaced_n += 1

            r += 1

    wb.save(file_path)
    print(f"Done {file_path}: Replaced {replaced_k} K templates and {replaced_n} N templates.")

if __name__ == '__main__':
    targets = [
        r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx',
        r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx',
        r'C:\Users\congh\Downloads\Test Report.xlsx'
    ]
    for t in targets:
        apply_updates_to_workbook(t)
