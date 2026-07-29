import pandas as pd
from app.models.schema import MsrpSchema

class MsrpParser:
    def parse(self, path:str) -> pd.DataFrame:
        df = pd.read_excel(path,sheet_name=MsrpSchema.SHEET,header=MsrpSchema.HEADER_ROW)
        required=[MsrpSchema.PART_NUMBER]
        missing=[c for c in required if c not in df.columns]
        if missing:
            raise ValueError(f'Missing MSRP columns: {missing}')
        return df
