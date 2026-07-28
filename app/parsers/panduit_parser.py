import pandas as pd

class PanduitParser:
    SHEET_NAME = 'SAP PRICELIST'

    def parse(self, path: str) -> pd.DataFrame:
        return pd.read_excel(path, sheet_name=self.SHEET_NAME)
