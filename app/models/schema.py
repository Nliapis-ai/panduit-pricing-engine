class PanduitSchema:
    SHEET='SAP PRICELIST'
    SAP_MATERIAL='Αρ.Εξαρτ.Κατασκευαστή'
    PART_NUMBER='Αριθμός Υλικού Προμηθ.'
    DESCRIPTION='Βασική Μον.Μέτρησης'
    BASE_UNIT='Ομάδα Υλικών 1'
    CURRENT_PRICE='Αρχική τιμή'

class MsrpSchema:
    SHEET='English'
    HEADER_ROW=7
    PART_NUMBER='Catalog Number'
    PRICE='Reference Price'
    MSRP='MSRP'
    INNER_PACKAGE='Inner (PKG) '
    METERS_PER_REEL='Meters/Reel'
    STATUS='Status'

class SpaSchema:
    SHEET='CONNECTIVITY'
    PART_NUMBER='PART NUMBER'
    NET_PRICE='NET PRICE'
