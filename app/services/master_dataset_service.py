from app.models.product_record import ProductRecord

class MasterDatasetService:
    def enrich_with_msrp(self, records:list[ProductRecord], msrp_lookup:dict):
        for record in records:
            record.msrp_price = msrp_lookup.get(record.part_number)
        return records

    def enrich_with_spa(self, records:list[ProductRecord], spa_lookup:dict):
        for record in records:
            record.spa_price = spa_lookup.get(record.part_number)
        return records
