from .brazil_licenses import (
    create_brazil_license,
    deactivate_brazil_license,
    get_brazil_license_or_404,
    list_brazil_licenses,
    renew_brazil_license,
    update_brazil_license,
)
from .customers import create_customer, deactivate_customer, get_customer_or_404, list_customers, update_customer
from .nj_licenses import (
    create_nj_license,
    deactivate_nj_license,
    get_nj_license_or_404,
    list_nj_licenses,
    renew_nj_license,
    update_nj_license,
)
from .passports import (
    create_passport,
    deactivate_passport,
    get_passport_or_404,
    list_passports,
    renew_passport,
    update_passport,
)
from .photos import get_customer_photo, upload_customer_photo

__all__ = [
    "create_brazil_license",
    "create_customer",
    "create_nj_license",
    "create_passport",
    "deactivate_brazil_license",
    "deactivate_customer",
    "deactivate_nj_license",
    "deactivate_passport",
    "get_brazil_license_or_404",
    "get_customer_or_404",
    "get_customer_photo",
    "get_nj_license_or_404",
    "get_passport_or_404",
    "list_brazil_licenses",
    "list_customers",
    "list_nj_licenses",
    "list_passports",
    "renew_brazil_license",
    "renew_nj_license",
    "renew_passport",
    "update_brazil_license",
    "update_customer",
    "update_nj_license",
    "update_passport",
    "upload_customer_photo",
]
