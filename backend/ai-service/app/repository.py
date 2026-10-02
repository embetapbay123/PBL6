"""Shared M4 repository frame: pass a caller-owned SQLAlchemy Session.

Do not create transactions per method or query another service database here.
Context/ownership and consent are checked by the module service before query.
"""
from sqlalchemy.orm import Session

class OwnedRepository:
    def __init__(self, session: Session):
        self.session=session
