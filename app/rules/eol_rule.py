from app.rules.base import PricingRule

class EolRule(PricingRule):
    priority = 7

    def matches(self, row):
        return row.eol

    def calculate(self, row):
        return row.current_price
