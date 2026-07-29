class CoverageReportService:
    def generate(self, records):
        total = len(records)
        return {
            'total_products': total,
            'msrp_matches': sum(1 for r in records if r.msrp_price is not None),
            'spa_matches': sum(1 for r in records if r.spa_price is not None),
            'eol_products': sum(1 for r in records if r.eol),
            'cable_products': sum(1 for r in records if getattr(r, 'reel_length', None) is not None),
        }
