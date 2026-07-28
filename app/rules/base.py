class PricingRule:
    priority:int=0

    def matches(self, row):
        return False

    def calculate(self, row):
        raise NotImplementedError
