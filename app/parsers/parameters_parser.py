import pandas as pd

class ParametersParser:
    def parse(self, path: str) -> dict[str, pd.DataFrame]:
        sheets = ['ΠΑΚΕΤΑ','ΣΤΡΟΦΕΙΑ','ΚΑΤΑΛΗΞΕΙΣ','EOL_ΕΠΙΒΕΒΑΙΩΜΕΝΑ','OVERRIDES']
        return {sheet: pd.read_excel(path, sheet_name=sheet) for sheet in sheets}
