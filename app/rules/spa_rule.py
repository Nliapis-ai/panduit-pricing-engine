from app.rules.base import PricingRule

class SpaRule(PricingRule):
    priority = 5

    def matches(self, row):
        return row.spa_price is not None

    def calculate(self, row):
        return row.spa_price
