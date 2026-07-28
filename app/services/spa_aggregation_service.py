from collections import defaultdict

class SpaAggregationService:
    def aggregate(self, rows:list[tuple[str,float]]):
        grouped = defaultdict(list)
        for part_number, price in rows:
            grouped[part_number].append(float(price))

        result = {}
        for part_number, prices in grouped.items():
            prices = sorted(prices)
            if len(prices) == 1:
                result[part_number] = prices[0]
            elif len(prices) == 2:
                result[part_number] = prices[-1]
            else:
                result[part_number] = prices[-2]
        return result
