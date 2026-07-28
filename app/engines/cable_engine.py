import re

class CableEngine:
    PATTERN = re.compile(r'^(ΚΑΛ\.?|ΚΑΛ)\b')

    def is_cable(self, description:str, base_unit:str|None) -> bool:
        return bool(self.PATTERN.match(description or '')) and base_unit == 'M'
