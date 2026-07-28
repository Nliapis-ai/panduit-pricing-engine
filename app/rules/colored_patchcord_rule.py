from app.rules.base import PricingRule

class ColoredPatchCordRule(PricingRule):
    priority = 3

    def matches(self, row):
        text = row.description.upper()
        return 'PATCH' in text and 'WH' not in row.part_number.upper()

    def calculate(self, row):
        return row.current_price
