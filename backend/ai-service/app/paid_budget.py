"""One monetary boundary for generation and chat vision; all admissions lock try_on_guard."""
from sqlalchemy import text


def shared_spend(db, day, month):
    values = dict(db.execute(text("""SELECT
      coalesce(sum(CASE WHEN cost_state='RELEASED' THEN 0 WHEN cost_state='SETTLED' THEN charged_micro_usd ELSE reserved_micro_usd END)
        FILTER(WHERE budget_day=:day OR cost_state IN ('RESERVED','UNKNOWN')),0) AS day_spend,
      coalesce(sum(CASE WHEN cost_state='RELEASED' THEN 0 WHEN cost_state='SETTLED' THEN charged_micro_usd ELSE reserved_micro_usd END)
        FILTER(WHERE budget_month=:month OR cost_state IN ('RESERVED','UNKNOWN')),0) AS month_spend
      FROM paid_ai_cost"""), {'day': day, 'month': month}).mappings().one())
    return {key: int(value) for key, value in values.items()}
