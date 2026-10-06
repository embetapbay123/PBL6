from .domain import current, response, set_consent, retain_recent

class ConsentService:
    def __init__(self, engine): self.engine=engine
    def get(self,user_id):
        with self.engine.begin() as db:
            retain_recent(db)
            return response(current(db,user_id))
    def update(self,user_id,payload):
        with self.engine.begin() as db:
            retain_recent(db)
            return set_consent(db,user_id,payload['status'],payload['expected_version'])
