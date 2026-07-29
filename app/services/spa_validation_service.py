class SpaValidationService:
    def validate(self, audit_records:list[dict]):
        warnings = []
        for record in audit_records:
            if record.get('spa_count', 0) > 3:
                warnings.append(record['part_number'])
        return warnings
