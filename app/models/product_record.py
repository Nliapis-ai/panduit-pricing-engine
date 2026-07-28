from pydantic import BaseModel

class ProductRecord(BaseModel):
    part_number:str
    description:str=''
    current_price:float=0
