from app.rules.base import PricingRule

class NetkeyRule(PricingRule):
    priority = 1

    def matches(self, row):
        return 'NETKEY' in row.description.upper()

    def calculate(self, row):
        return row.current_price
