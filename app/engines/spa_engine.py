class SpaEngine:
    def resolve_price(self, prices:list[float]) -> float | None:
        if not prices:
            return None
        values = sorted(float(v) for v in prices)
        if len(values) == 1:
            return values[0]
        if len(values) == 2:
            return values[-1]
        return values[-2]
