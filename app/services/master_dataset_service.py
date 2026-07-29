from app.models.product_record import ProductRecord
from app.engines.package_engine import PackageEngine
from app.engines.reel_engine import ReelEngine

class MasterDatasetService:
    def __init__(self):
        self.package_engine = PackageEngine()
        self.reel_engine = ReelEngine()

    def enrich(self, records:list[ProductRecord], msrp_lookup:dict, spa_lookup:dict, package_lookup:dict|None=None, reel_lookup:dict|None=None, eol_parts:set|None=None, override_lookup:dict|None=None, msrp_inner_lookup:dict|None=None, msrp_reel_lookup:dict|None=None, termination_lookup:dict|None=None):
        package_lookup = package_lookup or {}
        reel_lookup = reel_lookup or {}
        eol_parts = eol_parts or set()
        override_lookup = override_lookup or {}
        msrp_inner_lookup = msrp_inner_lookup or {}
        msrp_reel_lookup = msrp_reel_lookup or {}
        termination_lookup = termination_lookup or {}

        for record in records:
            part = record.part_number
            record.msrp_price = msrp_lookup.get(part)
            record.spa_price = spa_lookup.get(part)
            record.package_qty = self.package_engine.resolve_package_qty(part, override_lookup, package_lookup, msrp_inner_lookup)
            record.reel_length = self.reel_engine.resolve_reel_length(part, reel_lookup, msrp_reel_lookup, termination_lookup)
            record.eol = part in eol_parts
        return records
