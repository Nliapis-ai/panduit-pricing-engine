from app.models.product_record import ProductRecord

class DatasetBuilder:
    def build(self, panduit_df, msrp_df, spa_df, parameters):
        records = []
        for _, row in panduit_df.iterrows():
            records.append(ProductRecord(
                part_number=str(row.get('Αρ.Εξαρτ.Κατασκευαστή', '')),
                description=str(row.get('Περιγραφή', '')),
                current_price=float(row.get('Αρχική τιμή', 0) or 0),
                base_unit=str(row.get('Βασική Μονάδα', '')),
            ))
        return records
