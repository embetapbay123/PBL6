# -*- coding: utf-8 -*-
import docx

def fix_word_doc(doc_path):
    print(f"Applying audit fixes to: {doc_path}...")
    doc = docx.Document(doc_path)

    # 1. Fix Terminology in Paragraph 35: "lũy thừa" -> "lũy đẳng"
    p35_text = doc.paragraphs[35].text
    if 'tính lũy thừa' in p35_text:
        doc.paragraphs[35].text = p35_text.replace('tính lũy thừa', 'tính lũy đẳng')
        print("P35: Replaced 'tính lũy thừa' with 'tính lũy đẳng'.")

    # 2. Fix Terminology in Paragraph 41: "tính toàn tử" -> "tính nguyên tử (Atomicity)"
    p41_text = doc.paragraphs[41].text
    if 'tính toàn tử' in p41_text:
        doc.paragraphs[41].text = p41_text.replace('tính toàn tử', 'tính nguyên tử (Atomicity)')
        print("P41: Replaced 'tính toàn tử' with 'tính nguyên tử (Atomicity)'.")

    # 3. Fix Table 9 - Row 3 (Nguyễn Thị Thanh Hoa)
    t9 = doc.tables[9]
    hoa_row = t9.rows[3]

    # COL 2 (Lỗi & Re-test)
    hoa_row.cells[2].text = (
        "Nội dung kiểm thử: Giỏ hàng và checkout (12 ca: U37..U39, API25..API29, INT01, AND05, AND07, PERF03), "
        "vòng đời đơn hàng (15 ca: U23..U29, U43, API30..API33, INT02..INT04), ứng dụng di động Android (6 ca: AND01, AND06, AND08..AND11). "
        "(Lưu ý: Toàn bộ ca Web UI W06..W10, W13..W14, W20 do Nguyễn Hà phụ trách; AND06 là ca Pass form địa chỉ).\n"
        "• Lỗi R1: 4 ca Failed (API27: deadlock checkout hai Store A/B do gộp chung 2 transaction; "
        "API32: 2 seller đổi trạng thái cùng lúc ghi đè dữ liệu; "
        "AND07: bàn phím ảo che khuất nút Đặt hàng; "
        "AND11: co chữ/tràn nội dung trên màn hình nhỏ 360dp và font scale 1.3x); "
        "2 ca Pending (API33: hủy đơn đã thanh toán nhóm A/B chờ cấu hình mock adapter hoàn tiền; "
        "AND10: kiểm tra mạng yếu chờ cấu hình profile network throttling trên môi trường di động).\n"
        "• Lỗi R2: Dev fix xong R1 (tách 2 transaction độc lập cho API27; thêm TypeORM optimistic lock @VersionColumn cho API32; "
        "thêm SingleChildScrollView kèm viewInsets trong Flutter cho AND07); "
        "cấu hình xong môi trường và hoàn thành 2 ca Pending (API33 kích hoạt mock refund adapter, AND10 giả lập mạng yếu thành công). "
        "Phát sinh 1 lỗi hồi quy (API30: tìm kiếm đơn hàng phân biệt hoa thường và mất phân trang); "
        "ca AND11 tiếp tục Failed do giới hạn layout màn hình nhỏ.\n"
        "• Kết quả R3: Hotfix API30 (dùng truy vấn ILIKE không phân biệt hoa thường và giữ phân trang). "
        "Ca AND11 lập biên bản nghiệm thu có điều kiện (Known Limitation: thêm text ellipsis và tooltip, backlog v2.0). Đạt 32/33 ca (96.97%)."
    )

    # COL 3 (Minh chứng)
    hoa_row.cells[3].text = (
        "Minh chứng thực thi chi tiết:\n"
        "• Flutter Integration Test Log: reports/flutter-test-checkout-20261111.json (32 passed, 1 failed - Known Limitation AND11, duration: 4m12s).\n"
        "• Android Studio Logcat: reports/android-emulator-pixel4-api34-logcat.txt (Capture bàn phím ảo, viewInsets padding, font accessibility 1.3x, network throttling profile).\n"
        "• Order State Machine Trace: logs/order-saga-transitions-20261111.log (Audit trail: PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> COMPLETED).\n"
        "• Git Commit: PR #144 (tách payment transaction), PR #145 (TypeORM optimistic lock), PR #153 (hotfix API30 ILIKE). Cần hỗ trợ: Không."
    )
    print("Table 9: Updated Hoa's row (API33 as Pending R1, AND10 as Pending R1, AND11 as Failed R1).")

    # 4. Fix Table 9 - Row 1 (Nguyễn Minh Công)
    cong_row = t9.rows[1]
    cong_row.cells[2].text = (
        "Nội dung kiểm thử: Kiểm thử thanh toán SePay/COD/hoàn tiền và mock refund (9 ca: U44..U47, API34..API38), "
        "đánh giá sản phẩm (4 ca: U40..U42, API41), AI RAG Chatbot (12 ca: U48..U51, API42..API45, INT06, SEC08, EVAL01..EVAL02) "
        "và tải k6 (8 ca: PERF01..PERF02, PERF04..PERF09; riêng PERF03 thuộc Gio_Hang_Dat_Hang của Hoa). "
        "(Lưu ý: API38 kiểm tra cơ chế mock refund an toàn thuộc Công và Passed cả 3 vòng; các ca Web UI W11..W12, W15..W17 thuộc Nguyễn Hà).\n"
        "• Lỗi R1: 4 ca Failed (API43: thiếu consent cá nhân hóa vẫn trả kết quả RAG; "
        "PERF02: tải 100 VU p95 đạt 2.350ms > 2.000ms do thiếu Composite Index bảng Products; "
        "PERF06: stress test 120 VU xuất hiện lỗi 502 do cạn connection pool DB; "
        "PERF09: tải burst 100 VU Related Products gây nghẽn Redis cache miss, p95 vượt 3.8s); "
        "1 ca Pending (EVAL01: chờ thu thập đủ bộ dataset 100 câu hỏi benchmark chuẩn RAG Triad).\n"
        "• Lỗi R2: Dev fix xong API43, PERF02, PERF06 và nạp dataset chạy xong EVAL01; "
        "ca PERF09 tiếp tục Failed do CPU máy chủ Staging đơn node chạm 92%, p95 đạt 2.4s > 2.0s SLA.\n"
        "• Kết quả R3: Ca PERF09 ghi nhận Known Limitation (máy chủ đơn 2 vCPU 4GB RAM chỉ chịu tối đa 80 VU; "
        "kịch bản 100 VU burst chuyển giao Backlog Phase 2 trên hạ tầng AWS ECS multi-node). Đạt 32/33 ca (96.97%)."
    )
    print("Table 9: Updated Công's row (clarified API38 belongs to Công and is Passed 3 rounds).")

    doc.save(doc_path)
    print(f"Successfully saved audit fixes to {doc_path}!")

if __name__ == '__main__':
    fix_word_doc(r'C:\PBL6\docs\kiem-thu\Software_Test_Documentation.docx')
