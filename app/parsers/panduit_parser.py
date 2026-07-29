import pandas as pd
from app.models.schema import PanduitSchema

class PanduitParser:
    def parse(self, path:str) -> pd.DataFrame:
        df = pd.read_excel(path, sheet_name=PanduitSchema.SHEET)
        required=[PanduitSchema.PART_NUMBER,PanduitSchema.DESCRIPTION]
        missing=[c for c in required if c not in df.columns]
        if missing:
            raise ValueError(f'Missing Panduit columns: {missing}')
        return df
