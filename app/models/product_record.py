from pydantic import BaseModel
from typing import Optional

class ProductRecord(BaseModel):
    part_number: str
    description: str = ''
    base_unit: Optional[str] = None
    current_price: float = 0.0
    msrp_price: Optional[float] = None
    spa_price: Optional[float] = None
    package_qty: Optional[int] = None
    reel_length: Optional[int] = None
    eol: bool = False
    final_price: Optional[float] = None
    applied_rule: Optional[str] = None
