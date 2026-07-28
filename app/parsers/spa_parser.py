import pandas as pd

class SpaParser:
    SHEET_NAME = 'CONNECTIVITY'

    def parse(self, path: str) -> pd.DataFrame:
        return pd.read_excel(path, sheet_name=self.SHEET_NAME)
