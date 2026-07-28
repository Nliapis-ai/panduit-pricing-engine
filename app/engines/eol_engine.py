class EolEngine:
    def is_eol(self, part_number:str, eol_parts:set[str]) -> bool:
        return part_number in eol_parts
