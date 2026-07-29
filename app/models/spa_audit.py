from pydantic import BaseModel

class SpaAuditRecord(BaseModel):
    part_number:str
    spa_count:int
    selected_price:float
