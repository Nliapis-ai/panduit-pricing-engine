from app.models.product_record import ProductRecord
from app.models.schema import PanduitSchema

class DatasetBuilder:
    def build(self, panduit_df, msrp_df, spa_df, parameters):
        records = []
        for _, row in panduit_df.iterrows():
            records.append(ProductRecord(
                sap_material=str(row.get(PanduitSchema.SAP_MATERIAL, '')),
                part_number=str(row.get(PanduitSchema.PART_NUMBER, '')),
                description=str(row.get(PanduitSchema.DESCRIPTION, '')),
                current_price=float(row.get(PanduitSchema.CURRENT_PRICE, 0) or 0),
                base_unit=str(row.get(PanduitSchema.BASE_UNIT, '')),
            ))
        return records
