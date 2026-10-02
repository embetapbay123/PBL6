from uuid import uuid4
from .schemas import ChatMessageInput
from ..adapters import LanguageModel,MockLanguageModel

class MockChatService:
    """Contract example only: no stored session/history, retrieval, or AI side effect."""
    def __init__(self, provider:LanguageModel|None=None):
        self.provider=provider or MockLanguageModel()
    async def answer(self,session_id:str,input:ChatMessageInput):
        return {'id':str(uuid4()),'session_id':session_id,'role':'ASSISTANT',
                'content':await self.provider.answer(input.content,[]),'product_cards':[],
                'fallback':True,'mode':'mock'}
