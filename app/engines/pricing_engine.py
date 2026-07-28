from app.models.product_record import ProductRecord

class PricingEngine:
    def calculate(self, record: ProductRecord):
        return record.current_price
