"""Make the Store report express its dashboard and time-series requirements."""
from pathlib import Path
import json

path = Path(__file__).resolve().parents[1] / "docs/contracts/openapi.json"
api = json.loads(path.read_text(encoding="utf-8"))
report = api["components"]["schemas"]["StoreReport"]
report["properties"].update({
    "shipping_fee_vnd": {"type": "integer", "format": "int64", "minimum": 0},
    "order_count": {"type": "integer", "minimum": 0},
    "best_selling_product_ids": {"type": "array", "items": {"type": "string", "format": "uuid"}},
    "low_stock_variant_ids": {
        "type": "array", "items": {"type": "string", "format": "uuid"},
        "description": "M1 cung cấp qua contract; M2 không đọc DB M1.",
    },
    "revenue_series": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "bucket_start": {"type": "string", "format": "date-time"},
                "completed_goods_revenue_vnd": {"type": "integer", "format": "int64", "minimum": 0},
            },
            "required": ["bucket_start", "completed_goods_revenue_vnd"],
        },
    },
})
report["required"].extend((
    "shipping_fee_vnd", "order_count", "best_selling_product_ids", "low_stock_variant_ids", "revenue_series"
))
operation = api["paths"]["/store/reports"]["get"]
operation["parameters"] = [
    {"name": "from", "in": "query", "required": True,
     "schema": {"type": "string", "format": "date-time"},
     "description": "Đầu kỳ UTC, bao gồm."},
    {"name": "to", "in": "query", "required": True,
     "schema": {"type": "string", "format": "date-time"},
     "description": "Cuối kỳ UTC, không bao gồm; phải lớn hơn from."},
    {"name": "granularity", "in": "query", "required": False,
     "schema": {"type": "string", "enum": ["DAY", "MONTH"], "default": "DAY"}},
]
operation["description"] = (
    "Owner xem báo cáo Store membership hiện hành theo [from,to), nhóm DAY hoặc MONTH. "
    "Doanh thu hàng Completed tách tiền đã thu/hoàn và phí; low-stock lấy từ M1 qua contract."
)
path.write_text(json.dumps(api, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
