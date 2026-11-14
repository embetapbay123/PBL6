import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from ..internal_client import InternalError

BUSINESS_TZ = timezone(timedelta(hours=7))
MODEL = 'gpt-image-2.6-sunburst'
PROMPT_VERSION = 'try-on-one-garment-v1'
CONSENT_VERSION = 'try-on-openai-v1'
UPLOAD_LIMIT = 8 * 1024 * 1024


class TryOnError(InternalError):
    pass


def now():
    return datetime.now(timezone.utc)


def periods(at=None):
    local = (at or now()).astimezone(BUSINESS_TZ)
    reset = (local + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return local.date(), local.strftime('%Y-%m'), reset


@dataclass(frozen=True)
class Settings:
    enabled: bool = False
    api_key: str = ''
    signing_key: str = ''
    storage_dir: str = '/var/lib/pbl6/try-on'
    image_hosts: tuple[str, ...] = ('demo.congnguyen.me',)
    media_origin: str = 'http://web:3000'
    daily_budget: int = 0
    monthly_budget: int = 0
    reservation: int = 250000  # Conservative USD reserve, not a quoted per-image price.
    user_limit: int = 3
    daily_limit: int = 50
    monthly_limit: int = 500
    ip_daily_limit: int = 30
    concurrency: int = 2
    retention_hours: int = 24
    timeout_seconds: int = 120
    cooldown_seconds: int = 60
    demo_mode: bool = False
    demo_password_hash: str = ''

    @property
    def ready(self):
        from .demo import valid_hash
        return (self.enabled and bool(self.api_key) and len(self.signing_key) >= 32 and self.daily_budget >= self.reservation and self.monthly_budget >= self.reservation
                and (not self.demo_mode or valid_hash(self.demo_password_hash)))

    @classmethod
    def load(cls):
        def integer(name, default, lower, upper):
            value = int(os.getenv(name, str(default)))
            if not lower <= value <= upper:
                raise ValueError(f'Invalid {name}')
            return value
        key = os.getenv('OPENAI_API_KEY', '').strip()
        if any(c.isspace() for c in key):
            raise ValueError('Invalid OPENAI_API_KEY')
        enabled = os.getenv('TRY_ON_ENABLED', '0')
        if enabled not in ('0', '1'):
            raise ValueError('Invalid TRY_ON_ENABLED')
        demo_mode = os.getenv('TRY_ON_DEMO_MODE', '0')
        if demo_mode not in ('0', '1'):
            raise ValueError('Invalid TRY_ON_DEMO_MODE')
        return cls(enabled=enabled == '1', api_key=key,
                   demo_mode=demo_mode == '1', demo_password_hash=os.getenv('TRY_ON_DEMO_PASSWORD_HASH', ''),
                   signing_key=os.getenv('TRY_ON_SIGNING_KEY', ''),
                   storage_dir=os.getenv('TRY_ON_STORAGE_DIR', '/var/lib/pbl6/try-on'),
                   image_hosts=tuple(x.strip().lower() for x in os.getenv('TRY_ON_IMAGE_HOSTS', 'demo.congnguyen.me').split(',') if x.strip()),
                   media_origin=os.getenv('TRY_ON_MEDIA_ORIGIN', 'http://web:3000'),
                   daily_budget=integer('TRY_ON_DAILY_BUDGET_MICRO_USD', 0, 0, 100000000),
                   monthly_budget=integer('TRY_ON_MONTHLY_BUDGET_MICRO_USD', 0, 0, 1000000000),
                   reservation=integer('TRY_ON_RESERVATION_MICRO_USD', 250000, 10000, 1000000),
                   user_limit=integer('TRY_ON_USER_DAILY_LIMIT', 3, 1, 20),
                   daily_limit=integer('TRY_ON_DAILY_REQUEST_LIMIT', 50, 1, 1000),
                   monthly_limit=integer('TRY_ON_MONTHLY_REQUEST_LIMIT', 500, 1, 10000),
                   ip_daily_limit=integer('TRY_ON_IP_DAILY_LIMIT', 30, 1, 1000),
                   concurrency=integer('TRY_ON_CONCURRENCY', 2, 1, 5),
                   retention_hours=integer('TRY_ON_RETENTION_HOURS', 24, 1, 24),
                   timeout_seconds=integer('TRY_ON_TIMEOUT_SECONDS', 120, 10, 180))
