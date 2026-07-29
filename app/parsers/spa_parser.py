import pandas as pd
from app.models.schema import SpaSchema

class SpaParser:
    def parse(self, path:str) -> pd.DataFrame:
        df = pd.read_excel(path,sheet_name=SpaSchema.SHEET)
        required=[SpaSchema.PART_NUMBER,SpaSchema.NET_PRICE]
        missing=[c for c in required if c not in df.columns]
        if missing:
            raise ValueError(f'Missing SPA columns: {missing}')
        return df
