from app.models.schema import MsrpSchema

class LookupBuilder:
    def build_msrp_lookup(self, df):
        return self.build_column_lookup(df, MsrpSchema.PART_NUMBER, MsrpSchema.PRICE)

    def build_msrp_inner_lookup(self, df):
        return self.build_column_lookup(df, MsrpSchema.PART_NUMBER, MsrpSchema.INNER_PACKAGE)

    def build_msrp_reel_lookup(self, df):
        return self.build_column_lookup(df, MsrpSchema.PART_NUMBER, MsrpSchema.METERS_PER_REEL)

    def build_msrp_status_lookup(self, df):
        return self.build_column_lookup(df, MsrpSchema.PART_NUMBER, MsrpSchema.STATUS)

    def build_column_lookup(self, df, part_column, value_column):
        if df is None or part_column not in df.columns or value_column not in df.columns:
            return {}
        return dict(zip(df[part_column].astype(str), df[value_column]))

    def build_eol_lookup(self, df, part_column='Part Number'):
        if df is None or part_column not in df.columns:
            return set()
        return set(df[part_column].astype(str))

    def build_spa_lookup(self, aggregated_prices:dict):
        return {str(k): v for k, v in aggregated_prices.items()}
