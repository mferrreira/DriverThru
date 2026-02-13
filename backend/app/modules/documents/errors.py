from __future__ import annotations


class TemplateNotFoundError(ValueError):
    pass


class CustomerNotFoundError(ValueError):
    pass


class DocumentNotFoundError(ValueError):
    pass


class InvalidSelectionError(ValueError):
    pass
