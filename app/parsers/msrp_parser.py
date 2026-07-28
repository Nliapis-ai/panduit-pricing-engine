import pandas as pd

class MsrpParser:
    SHEET_NAME = 'English'
    HEADER_ROW = 6

    def parse(self, path: str) -> pd.DataFrame:
        return pd.read_excel(path, sheet_name=self.SHEET_NAME, header=self.HEADER_ROW)
