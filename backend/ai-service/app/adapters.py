"""Mock-first interfaces. Real providers belong to Công's AI implementation tasks."""
from typing import Protocol

class LanguageModel(Protocol):
    async def answer(self, question: str, verified_context: list[dict]) -> str: ...

class MockLanguageModel:
    async def answer(self, question: str, verified_context: list[dict]) -> str:
        return 'AI mô phỏng: chưa có RAG hoặc model được nghiệm thu.'

class RecommendationModel(Protocol):
    async def recommend(self, user_id: str | None, candidates: list[dict]) -> list[dict]: ...

class MockRecommendation:
    async def recommend(self, user_id: str | None, candidates: list[dict]) -> list[dict]:
        return sorted(candidates, key=lambda product: product['id'])[:3]
