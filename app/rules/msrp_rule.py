from app.rules.base import PricingRule

class MsrpRule(PricingRule):
    priority = 6

    def matches(self, row):
        return row.msrp_price is not None

    def calculate(self, row):
        return row.msrp_price
