class LookupBuilder:
    def build_msrp_lookup(self, df):
        if 'Catalog Number' not in df.columns or 'Reference Price' not in df.columns:
            return {}
        return dict(zip(df['Catalog Number'].astype(str), df['Reference Price']))

    def build_spa_lookup(self, aggregated_prices:dict):
        return {str(k): v for k, v in aggregated_prices.items()}
