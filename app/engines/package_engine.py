class PackageEngine:
    def resolve_package_qty(self, part_number:str, override_lookup:dict, package_lookup:dict, msrp_inner_lookup:dict):
        if part_number in override_lookup:
            return override_lookup[part_number]
        if part_number in package_lookup:
            return package_lookup[part_number]
        return msrp_inner_lookup.get(part_number)
