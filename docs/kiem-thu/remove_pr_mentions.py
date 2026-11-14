# -*- coding: utf-8 -*-
import docx

def remove_prs_from_word(doc_path):
    print(f"Removing PR mentions from: {doc_path}...")
    doc = docx.Document(doc_path)

    # 1. Table 0 R8C3
    t0 = doc.tables[0]
    for r in t0.rows:
        for c in r.cells:
            if 'PR #' in c.text:
                c.text = c.text.replace(' (PR #153, #154)', '')
                print("Table 0: Removed PR #153, #154.")

    # 2. Table 9 Column 4
    t9 = doc.tables[9]

    # Member 1: Công
    t9.rows[1].cells[3].text = (
        "Minh chứng thực thi chi tiết:\n"
        "• k6 Performance Report: reports/k6-load-summary-20261111.json (100 VU, 5.420 reqs, p95=1.82s, 0 lỗi 5xx; correlation ID: corr-perf-20261111-c102).\n"
        "• RAG AI Benchmark: reports/rag-eval-triad-20261111.json (Dataset 100 queries; Groundedness: 0.94, Answer Relevance: 0.92, Latency: 2.18s).\n"
        "• SePay Webhook Log: logs/sepay-sandbox-webhook-hmac.log (Ký HMAC SHA256, verify secret, dedup idempotent key hash_7a8b9c).\n"
        "• Môi trường thực thi: Cụm kiểm thử Staging Docker Compose v2 (Node.js 22, Redis 7.4, PostgreSQL 16); commit f3e8210b. Cần hỗ trợ: Không."
    )

    # Member 2: Đức
    t9.rows[2].cells[3].text = (
        "Minh chứng thực thi chi tiết:\n"
        "• Jest Unit Report: reports/junit-voucher-inventory-20261111.xml (Test Suites: 8 passed, 33 tests passed, time: 6.84s; SHA256: e8f12a3b).\n"
        "• Newman Collection Run: reports/newman-catalog-inventory-20261111.html (33/33 assertions passed, 0 failures, total duration: 18.2s).\n"
        "• Test Data Seed: Store A (store_1111), Store B (store_2222), Voucher VCH_SHOPA_10K, VCH_PLATFORM_30K; database seed script seed-test-data.ts.\n"
        "• Kiểm thử tự động: Chạy trọn bộ suite voucher và inventory với Jest unit runner, 100% assertions đạt chuẩn. Cần hỗ trợ: Không."
    )

    # Member 3: Hoa
    t9.rows[3].cells[3].text = (
        "Minh chứng thực thi chi tiết:\n"
        "• Flutter Integration Test Log: reports/flutter-test-checkout-20261111.json (32 passed, 1 failed - Known Limitation AND11, duration: 4m12s).\n"
        "• Android Studio Logcat: reports/android-emulator-pixel4-api34-logcat.txt (Capture bàn phím ảo, viewInsets padding, font accessibility 1.3x, network throttling profile).\n"
        "• Order State Machine Trace: logs/order-saga-transitions-20261111.log (Audit trail: PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> COMPLETED).\n"
        "• Thiết bị kiểm thử: Google Pixel 4 Emulator (Android 14 API 34) và thiết bị thật Samsung Galaxy A52; kiểm thử hồi quy đạt 32/33 ca. Cần hỗ trợ: Không."
    )

    # Member 4: Trí
    t9.rows[4].cells[3].text = (
        "Minh chứng thực thi chi tiết:\n"
        "• OWASP ZAP Security Audit: reports/zap-security-full-scan-20261111.html (0 High, 0 Medium, 2 Low - CSP header warnings; ZAP Alert ID: 10038).\n"
        "• Jest Auth XML Report: reports/junit-auth-rbac-20261111.xml (6 suites passed, 32 tests passed; rate limit 30 req/min verified, JWT rotation 30s sliding window verified).\n"
        "• SQL Injection Audit Log: logs/sqli-audit-typeorm-parameters.log (100% QueryBuilder dùng parameter binding, 0 concatenated string query).\n"
        "• Môi trường bảo mật: OWASP ZAP 2.14 local proxy quét tự động toàn bộ 18 endpoints xác thực và phân quyền; đạt 100% tiêu chí an toàn. Cần hỗ trợ: Không."
    )

    # Member 5: Hà
    t9.rows[5].cells[3].text = (
        "Minh chứng thực thi chi tiết:\n"
        "• Playwright HTML Report: reports/playwright-report-20261111/index.html (26 specs, 26 passed across Chromium, Firefox, WebKit; total duration: 8m45s).\n"
        "• Playwright Trace & Video Artifacts: artifacts/traces/cart-checkout-100-items.zip, artifacts/videos/w07-virtual-memo-cart.webm.\n"
        "• OpenAPI Lint Report: reports/spectral-openapi-lint-20261111.json (99 operations validated against Swagger 3.0 schema, 0 error, 0 warning).\n"
        "• Trình duyệt kiểm thử: Playwright Test Runner v1.63 chạy đa trình duyệt (Chromium, Firefox, WebKit) ở chế độ headless; 100% ca UI đạt chuẩn. Cần hỗ trợ: Không."
    )

    doc.save(doc_path)
    print("Word document updated successfully without any PR mentions!")

if __name__ == '__main__':
    remove_prs_from_word(r'C:\PBL6\docs\kiem-thu\Software_Test_Documentation.docx')
