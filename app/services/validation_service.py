class ValidationService:
    GOLDEN_CASES = {
        'PLT2S-C': 9.84,
        'MLT2S-CP': 112.87,
        'BT4LH-TL0': 117.70,
        'LCD6-14AF-L': 11.71,
        'FACCZ12-40': 341.88,
        'PSL7A04WH-HED': 332.91,
        'NFY6C04BU-FEG': 68.32,
    }

    def validate_golden_cases(self, results:dict, tolerance:float = 0.01):
        errors = []
        for part, expected in self.GOLDEN_CASES.items():
            actual = results.get(part)
            if actual is None or abs(actual - expected) > tolerance:
                errors.append(part)
        return errors
