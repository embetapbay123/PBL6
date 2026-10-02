from pydantic import BaseModel,ConfigDict,Field

class ChatMessageInput(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    content:str=Field(min_length=1,max_length=2000)
