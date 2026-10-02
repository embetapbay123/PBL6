"""Expose one role-scoped AI metrics contract to Owner and Administrator."""
from pathlib import Path
import json

path = Path(__file__).resolve().parents[1] / "docs/contracts/openapi.json"
api = json.loads(path.read_text(encoding="utf-8"))
operation = api["paths"].pop("/admin/ai/metrics")["get"]
operation["summary"] = "Xem metric AI theo phạm vi Store hoặc toàn sàn"
operation["description"] = (
    "Owner chỉ thấy metric/log đã khử PII của Store membership hiện hành. "
    "Administrator thấy số liệu toàn sàn. Chưa có training/evaluation run phải trả "
    "evaluation_status=NOT_RUN, không dựng metric giả."
)
operation["x-required-roles"] = ["STORE_OWNER", "ADMIN"]
operation["x-data-scope"] = "ROLE_SCOPED_STORE_OR_PLATFORM"
operation["parameters"] = [{
    "name": "store_id", "in": "query", "required": False,
    "schema": {"type": "string", "format": "uuid"},
    "description": "Admin có thể lọc Store; Owner bỏ trống hoặc dùng đúng Store membership, Store khác trả 403/404.",
}]
operation["responses"]["200"]["description"] = "Metric AI trong phạm vi quyền hiện hành"
api["paths"]["/ai/metrics"] = {"get": operation}
path.write_text(json.dumps(api, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
