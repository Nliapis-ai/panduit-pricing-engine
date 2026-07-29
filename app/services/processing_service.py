from app.services.dataset_builder import DatasetBuilder
from app.services.master_dataset_service import MasterDatasetService
from app.services.pricing_service import PricingService

class ProcessingService:
    def __init__(self):
        self.dataset_builder = DatasetBuilder()
        self.master_dataset = MasterDatasetService()
        self.pricing_service = PricingService()

    def process(self, panduit_df, msrp_lookup, spa_lookup, parameters=None):
        records = self.dataset_builder.build(panduit_df, None, None, parameters)
        records = self.master_dataset.enrich_with_msrp(records, msrp_lookup)
        records = self.master_dataset.enrich_with_spa(records, spa_lookup)
        return self.pricing_service.apply(records)
