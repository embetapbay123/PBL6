from ..adapters import RecommendationModel,MockRecommendation

class MockRecommendationService:
    def __init__(self,model:RecommendationModel|None=None):
        self.model=model or MockRecommendation()
    async def recommend(self,user_id:str|None,verified_products:list[dict]):
        items=await self.model.recommend(user_id,verified_products)
        return {'source':'FALLBACK','model_version':'mock','product_ids':[item['id'] for item in items],
                'recently_viewed_product_ids':[],'mode':'mock','evaluation_status':'NOT_RUN'}
