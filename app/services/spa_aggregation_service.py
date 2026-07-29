from collections import defaultdict

class SpaAggregationService:
    def aggregate(self, rows:list[tuple[str,float]]):
        grouped = defaultdict(list)
        for part_number, price in rows:
            grouped[str(part_number)].append(float(price))
        result = {}
        for part_number, prices in grouped.items():
            prices = sorted(prices)
            result[part_number] = prices[0] if len(prices)==1 else prices[-1] if len(prices)==2 else prices[-2]
        return result

    def apply_bl_aw_jack_rule(self, spa_lookup:dict[str,float]):
        enriched = dict(spa_lookup)
        for part_number, price in list(spa_lookup.items()):
            if part_number.endswith('BL'):
                aw_part = f'{part_number[:-2]}AW'
                if aw_part in spa_lookup:
                    enriched[part_number] = max(price, spa_lookup[aw_part])
        return enriched
