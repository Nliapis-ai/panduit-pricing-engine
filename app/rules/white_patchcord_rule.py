from app.rules.base import PricingRule

class WhitePatchCordRule(PricingRule):
    priority = 4

    def matches(self, row):
        text = row.description.upper()
        return 'PATCH' in text and 'WH' in row.part_number.upper()

    def calculate(self, row):
        return row.current_price
