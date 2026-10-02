from ..repository import OwnedRepository

class TrackingRepository(OwnedRepository):
    """Implement consent-aware event dedup/ingestion; never accept arbitrary user identity from client."""
    pass
