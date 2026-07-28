class LookupBuilder:
    def build_msrp_lookup(self, df):
        if 'Catalog Number' not in df.columns:
            return {}
        return dict(zip(df['Catalog Number'], df.iloc[:,0] * 0 + df.get('Reference Price', df.iloc[:,0])))

    def build_spa_lookup(self, grouped_prices:dict):
        return grouped_prices
