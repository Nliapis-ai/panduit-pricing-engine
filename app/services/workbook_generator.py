from openpyxl import Workbook

class WorkbookGenerator:
    REQUIRED_SHEETS = [
        'SAP PRICELIST',
        'CHANGELOG',
        'ΑΝΑΓΩΓΕΣ',
        'ΚΑΛΩΔΙΑ',
        'ΜΕ_SPA',
        'ΓΙΑ_ΕΛΕΓΧΟ',
        'EOL',
        'ΣΥΝΟΨΗ',
        'ERROR_REPORT',
    ]

    def create(self, output_path:str):
        wb = Workbook()
        ws = wb.active
        ws.title = self.REQUIRED_SHEETS[0]

        for sheet in self.REQUIRED_SHEETS[1:]:
            wb.create_sheet(sheet)

        wb.save(output_path)
        return output_path
