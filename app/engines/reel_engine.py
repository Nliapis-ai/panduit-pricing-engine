class ReelEngine:
    def resolve_reel_length(self, part_number:str, reel_lookup:dict, msrp_reel_lookup:dict, termination_lookup:dict):
        if part_number in reel_lookup:
            return reel_lookup[part_number]
        if part_number in msrp_reel_lookup:
            return msrp_reel_lookup[part_number]
        return termination_lookup.get(part_number)
