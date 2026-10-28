from contextlib import contextmanager
from app.chat.retrieval import retrieve
from app.chat.provider import Selection,compose

class EmptyIndex:
    @contextmanager
    def connect(self):
        class Database:
            def execute(self,*args,**kwargs):
                class Rows:
                    def mappings(self):return self
                    def all(self):return []
                return Rows()
        yield Database()

def product(id,title,amount):
    return {'id':id,'title':title,'description':'Hàng demo','version':1,
            'variants':[{'status':'ACTIVE','price_vnd':amount}]}

def test_fashion_query_resolves_catalog_items_without_suggesting_unrelated_products():
    items=[product('a','Áo sơ mi',100000),product('b','Chuột không dây màu trắng',200000)]
    assert [p['id'] for p in retrieve(EmptyIndex(),'Gợi ý sản phẩm thời trang cho tôi',items)]==['a']
    assert retrieve(EmptyIndex(),'Gợi ý thời trang dưới 50k',items)==[]
    assert retrieve(EmptyIndex(),'máy ảnh',items)==[]

def test_no_match_explains_search_instead_of_claiming_model_is_unavailable():
    content,cards=compose(Selection((),True,'NO_MATCH','openai_compatible'),[])
    assert 'Chưa tìm thấy' in content and 'model chưa sẵn sàng' not in content
    assert cards==[]
