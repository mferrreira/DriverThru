from __future__ import annotations


class CustomerNotFoundError(ValueError):
    pass


class LicenseNotFoundError(ValueError):
    pass


class PassportNotFoundError(ValueError):
    pass


class CustomerPhotoNotFoundError(ValueError):
    pass
