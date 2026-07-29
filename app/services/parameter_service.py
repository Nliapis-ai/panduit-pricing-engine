class ParameterService:
    def extract_lookups(self, parameter_sheets:dict):
        return {
            'packages': parameter_sheets.get('ΠΑΚΕΤΑ'),
            'reels': parameter_sheets.get('ΣΤΡΟΦΕΙΑ'),
            'terminations': parameter_sheets.get('ΚΑΤΑΛΗΞΕΙΣ'),
            'eol': parameter_sheets.get('EOL_ΕΠΙΒΕΒΑΙΩΜΕΝΑ'),
            'overrides': parameter_sheets.get('OVERRIDES'),
        }
