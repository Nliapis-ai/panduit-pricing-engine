from app.rules.base import PricingRule

class TerminalRule(PricingRule):
    priority = 2

    def matches(self, row):
        text = row.description.upper()
        return 'ΑΚΡΟΔΕΚΤ' in text or 'ΚΩΣ ΠΡΕΣΑΣ' in text

    def calculate(self, row):
        return row.current_price
