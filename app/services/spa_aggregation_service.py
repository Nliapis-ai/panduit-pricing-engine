from collections import defaultdict
from app.engines.spa_engine import SpaEngine

class SpaAggregationService:
    def __init__(self):
        self.engine = SpaEngine()

    def aggregate(self, rows:list[tuple[str,float]]):
        grouped = defaultdict(list)
        for part_number, price in rows:
            grouped[str(part_number)].append(float(price))

        aggregated = {}
        audit = []

        for part_number, prices in grouped.items():
            final_price = self.engine.resolve_price(prices)
            aggregated[part_number] = final_price
            audit.append({
                'part_number': part_number,
                'spa_count': len(prices),
                'selected_price': final_price,
            })

        return aggregated, audit

    def apply_bl_aw_jack_rule(self, spa_lookup:dict[str,float], descriptions:dict[str,str]):
        enriched = dict(spa_lookup)
        audit = []

        for part_number, price in list(spa_lookup.items()):
            description = descriptions.get(part_number, '').upper()
            if 'JACK' not in description:
                continue
            if not part_number.endswith('BL'):
                continue

            aw_part = f'{part_number[:-2]}AW'
            if aw_part not in spa_lookup:
                continue

            selected = max(price, spa_lookup[aw_part])
            enriched[part_number] = selected

            audit.append({
                'bl_part': part_number,
                'aw_part': aw_part,
                'selected_price': selected,
                'rule': 'JACK_BL_AW'
            })

        return enriched, audit
