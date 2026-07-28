from pydantic import BaseModel

class PricingResult(BaseModel):
    part_number:str
    final_price:float
    rule_applied:str
