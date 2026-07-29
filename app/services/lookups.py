class LookupBuilder:
    def build_msrp_lookup(self, df):
        if 'Catalog Number' not in df.columns or 'Reference Price' not in df.columns:
            return {}
        return dict(zip(df['Catalog Number'].astype(str), df['Reference Price']))

    def build_package_lookup(self, df, part_column='Part Number', value_column='Package Qty'):
        if part_column not in df.columns or value_column not in df.columns:
            return {}
        return dict(zip(df[part_column].astype(str), df[value_column]))

    def build_reel_lookup(self, df, part_column='Part Number', value_column='Reel Length'):
        if part_column not in df.columns or value_column not in df.columns:
            return {}
        return dict(zip(df[part_column].astype(str), df[value_column]))

    def build_eol_lookup(self, df, part_column='Part Number'):
        if part_column not in df.columns:
            return set()
        return set(df[part_column].astype(str))

    def build_spa_lookup(self, aggregated_prices:dict):
        return {str(k): v for k,v in aggregated_prices.items()}
