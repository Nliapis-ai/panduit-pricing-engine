from app.rules.spa_rule import SpaRule
from app.rules.msrp_rule import MsrpRule
from app.rules.eol_rule import EolRule
from app.rules.netkey_rule import NetkeyRule
from app.rules.terminal_rule import TerminalRule

class PricingService:
    def __init__(self):
        self.rules = sorted([
            NetkeyRule(),
            TerminalRule(),
            SpaRule(),
            MsrpRule(),
            EolRule(),
        ], key=lambda r: r.priority)

    def apply(self, records):
        for record in records:
            for rule in self.rules:
                if rule.matches(record):
                    record.final_price = rule.calculate(record)
                    record.applied_rule = rule.__class__.__name__
                    break
        return records
