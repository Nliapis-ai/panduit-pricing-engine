from app.rules.base import PricingRule

class RuleRegistry:
    def __init__(self, rules:list[PricingRule]):
        self.rules=sorted(rules,key=lambda r:r.priority)
