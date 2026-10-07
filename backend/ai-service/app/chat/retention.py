"""Delete session content after 30 days and telemetry after 7 days. No PII logs."""
import os,json
from sqlalchemy import create_engine,text

def retain(engine):
    with engine.begin() as db:
        messages=db.execute(text("DELETE FROM chat_message WHERE session_id IN (SELECT id FROM chat_session WHERE created_at<now()-interval '30 days')")).rowcount
        sessions=db.execute(text("DELETE FROM chat_session WHERE created_at<now()-interval '30 days'")).rowcount
        traces=db.execute(text("DELETE FROM ai_request_trace WHERE created_at<now()-interval '7 days'")).rowcount
        budgets=db.execute(text("DELETE FROM ai_usage_budget WHERE day<current_date-2")).rowcount
    return {'messages':messages,'sessions':sessions,'traces':traces,'budgets':budgets}

if __name__=='__main__':
    engine=create_engine(os.environ['M4_DATABASE_URL'].replace('postgresql://','postgresql+psycopg://',1))
    try:print(json.dumps(retain(engine)))
    finally:engine.dispose()
