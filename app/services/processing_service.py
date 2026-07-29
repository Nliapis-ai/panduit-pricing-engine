from app.services.dataset_builder import DatasetBuilder
from app.services.master_dataset_service import MasterDatasetService
from app.services.pricing_service import PricingService

class ProcessingService:
    def __init__(self):
        self.dataset_builder = DatasetBuilder()
        self.master_dataset = MasterDatasetService()
        self.pricing_service = PricingService()

    def process(self, panduit_df, msrp_lookup, spa_lookup, package_lookup=None, reel_lookup=None, eol_parts=None):
        records = self.dataset_builder.build(panduit_df, None, None, None)

        records = self.master_dataset.enrich(
            records,
            msrp_lookup=msrp_lookup,
            spa_lookup=spa_lookup,
            package_lookup=package_lookup,
            reel_lookup=reel_lookup,
            eol_parts=eol_parts,
        )

        return self.pricing_service.apply(records)
