from app.models.product_record import ProductRecord

class MasterDatasetService:
    def enrich(self, records:list[ProductRecord], msrp_lookup:dict, spa_lookup:dict, package_lookup:dict|None=None, reel_lookup:dict|None=None, eol_parts:set|None=None):
        package_lookup = package_lookup or {}
        reel_lookup = reel_lookup or {}
        eol_parts = eol_parts or set()

        for record in records:
            part = record.part_number
            record.msrp_price = msrp_lookup.get(part)
            record.spa_price = spa_lookup.get(part)
            record.package_qty = package_lookup.get(part)
            record.reel_length = reel_lookup.get(part)
            record.eol = part in eol_parts

        return records
