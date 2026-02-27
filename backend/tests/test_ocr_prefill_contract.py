from __future__ import annotations

import sys
import unittest
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.modules.ocr.ports import OCRProviderResult
from app.modules.ocr.schemas import OCRProviderName
from app.modules.ocr.services.prefill_brazil_license_form_from_document_use_case import (
    prefill_brazil_license_form_from_document,
)
from app.modules.ocr.services.prefill_customer_form_from_document_use_case import (
    prefill_customer_form_from_document,
)


class _FakeProvider:
    def __init__(self, text: str) -> None:
        self._text = text

    @property
    def name(self) -> OCRProviderName:
        return OCRProviderName.ANTHROPIC

    def extract_text(self, payload: bytes, content_type: str | None, *, options=None) -> OCRProviderResult:  # noqa: ANN001
        return OCRProviderResult(text=self._text, confidence=0.92, warnings=[])


class OCRPrefillContractTests(unittest.TestCase):
    def test_generic_prefill_forces_apply_customer_fields_false_for_license_json(self) -> None:
        provider = _FakeProvider(
            """
            {
              "document_kind": "brazil_cnh",
              "target_form": "brazil_driver_license",
              "apply_customer_fields": true,
              "customer_fields": {"first_name": "JOAO", "last_name": "SILVA"},
              "document_fields": {"full_name": "JOAO SILVA", "category": "B"},
              "confidence": 0.88,
              "warnings": []
            }
            """
        )

        response = prefill_customer_form_from_document(provider, b"fake", "image/jpeg")

        self.assertFalse(response.apply_customer_fields)
        self.assertIsNone(response.customer_fields.first_name)
        self.assertIsNone(response.customer_fields.last_name)
        self.assertEqual(response.target_form.value, "brazil_driver_license")

    def test_generic_prefill_forces_apply_customer_fields_false_for_license_heuristic(self) -> None:
        provider = _FakeProvider(
            "NEW JERSEY DRIVER LICENSE\nJOHN DOE\nDOB 01/01/2000\nDLN X1234567"
        )

        response = prefill_customer_form_from_document(provider, b"fake", "image/jpeg")

        self.assertFalse(response.apply_customer_fields)
        self.assertIsNone(response.customer_fields.first_name)
        self.assertEqual(response.target_form.value, "nj_driver_license")

    def test_specific_brazil_license_prefill_is_stateless_and_never_sets_customer_fields(self) -> None:
        provider = _FakeProvider(
            """
            {
              "brazil_form": {
                "full_name": "JOAO SILVA",
                "category": "AB",
                "registry_number": "123456789"
              },
              "confidence": 0.9,
              "warnings": []
            }
            """
        )

        response = prefill_brazil_license_form_from_document(provider, b"fake", "image/jpeg")

        self.assertFalse(response.apply_customer_fields)
        self.assertIsNone(response.customer_form.first_name)
        self.assertEqual(response.brazil_form.category, "AB")


if __name__ == "__main__":
    unittest.main()
