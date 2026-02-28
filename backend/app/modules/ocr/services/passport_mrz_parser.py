from __future__ import annotations

from dataclasses import dataclass
from datetime import date
import re


@dataclass(slots=True)
class ParsedPassportMrz:
    document_type: str | None = None
    issuing_country: str | None = None
    passport_number: str | None = None
    nationality: str | None = None
    surname: str | None = None
    given_names: str | None = None
    birth_date: str | None = None
    expiration_date: str | None = None
    sex: str | None = None


def extract_td3_mrz_lines(raw_text: str) -> list[str]:
    if "EMPTY_MRZ" in (raw_text or "").upper():
        return []

    candidates: list[str] = []
    for raw_line in raw_text.splitlines():
        cleaned = re.sub(r"[^A-Z0-9<]", "", raw_line.strip().upper())
        if len(cleaned) < 30 or "<" not in cleaned:
            continue
        candidates.append(cleaned)

    if len(candidates) < 2:
        return []

    # Prefer an adjacent two-line candidate that looks like TD3.
    for idx in range(len(candidates) - 1):
        first = candidates[idx]
        second = candidates[idx + 1]
        if first.startswith("P<"):
            return [first, second]

    return []


def parse_passport_mrz(lines: list[str]) -> ParsedPassportMrz | None:
    if len(lines) < 2:
        return None
    line1_raw = lines[0].strip().upper()
    line2_raw = lines[1].strip().upper()
    if len(line1_raw) < 30 or len(line2_raw) < 30:
        return None
    line1 = _normalize_td3_line(line1_raw)
    line2 = _normalize_td3_line(line2_raw)

    parsed = _parse_with_mrz_library(line1, line2)
    if parsed is not None:
        return parsed
    return _parse_td3_fallback(line1, line2)


def validate_td3_mrz_lines(lines: list[str]) -> list[str]:
    problems: list[str] = []
    if len(lines) != 2:
        return ["MRZ must contain exactly 2 lines."]

    line1 = (lines[0] or "").strip().upper()
    line2 = (lines[1] or "").strip().upper()

    if len(line1) != 44 or len(line2) != 44:
        problems.append("MRZ lines must be exactly 44 characters.")
    if not re.fullmatch(r"[A-Z0-9<]{44}", line1 or ""):
        problems.append("MRZ line 1 contains invalid characters.")
    if not re.fullmatch(r"[A-Z0-9<]{44}", line2 or ""):
        problems.append("MRZ line 2 contains invalid characters.")
    if not line1.startswith("P<"):
        problems.append("MRZ line 1 must start with 'P<'.")
    if problems:
        return problems

    if not _check_digit_ok(line2[0:9], line2[9]):
        problems.append("Invalid passport number check digit.")
    if not _check_digit_ok(line2[13:19], line2[19]):
        problems.append("Invalid birth date check digit.")
    if not _check_digit_ok(line2[21:27], line2[27]):
        problems.append("Invalid expiration date check digit.")

    return problems


def _parse_with_mrz_library(line1: str, line2: str) -> ParsedPassportMrz | None:
    try:
        from mrz.checker.td3 import TD3CodeChecker  # type: ignore
    except Exception:
        return None

    try:
        checker = TD3CodeChecker(f"{line1}\n{line2}")
        fields = checker.fields() if hasattr(checker, "fields") else {}
        if not isinstance(fields, dict):
            return None
    except Exception:
        return None

    surname, given_names = _split_name_field(str(fields.get("surname", "")), str(fields.get("name", "")))
    birth_date = _normalize_yyMMdd(str(fields.get("birth_date", "")).replace("<", ""))
    expiration_date = _normalize_yyMMdd(str(fields.get("expiration_date", "")).replace("<", ""))
    sex = _normalize_sex(str(fields.get("sex", "")))

    return ParsedPassportMrz(
        document_type=_clean_value(str(fields.get("document_type", ""))),
        issuing_country=_clean_value(str(fields.get("country", ""))),
        passport_number=_clean_value(str(fields.get("number", ""))),
        nationality=_clean_value(str(fields.get("nationality", ""))),
        surname=surname,
        given_names=given_names,
        birth_date=birth_date,
        expiration_date=expiration_date,
        sex=sex,
    )


def _parse_td3_fallback(line1: str, line2: str) -> ParsedPassportMrz:
    names_raw = line1[5:44]
    surname_raw, given_raw = _split_td3_names(names_raw)
    return ParsedPassportMrz(
        document_type=_clean_value(line1[0:2].replace("<", "")),
        issuing_country=_clean_value(line1[2:5]),
        passport_number=_clean_value(line2[0:9].replace("<", "")),
        nationality=_clean_value(line2[10:13]),
        surname=_clean_name(surname_raw),
        given_names=_clean_name(given_raw.replace("<", " ")),
        birth_date=_normalize_yyMMdd(line2[13:19]),
        expiration_date=_normalize_yyMMdd(line2[21:27]),
        sex=_normalize_sex(line2[20:21]),
    )


def _split_td3_names(raw: str) -> tuple[str, str]:
    core = raw.rstrip("<")
    if "<<" in core:
        parts = core.split("<<", maxsplit=1)
        surname = parts[0] if parts else ""
        given = parts[1] if len(parts) > 1 else ""
        return surname.replace("<", " "), given

    # Heuristic for malformed samples that use single '<' between all tokens.
    tokens = [token for token in core.split("<") if token]
    if not tokens:
        return "", ""
    surname = tokens[0]
    given = " ".join(tokens[1:]) if len(tokens) > 1 else ""
    return surname, given


def _split_name_field(surname: str, names: str) -> tuple[str | None, str | None]:
    clean_surname = _clean_name(surname)
    clean_names = _clean_name(names.replace("<", " "))

    # Heuristic for malformed MRZ where given names get merged into surname.
    if clean_surname and not clean_names and " " in clean_surname:
        parts = [chunk for chunk in clean_surname.split(" ") if chunk]
        if len(parts) > 1:
            clean_surname = parts[0]
            clean_names = " ".join(parts[1:])
    return clean_surname, clean_names


def _clean_name(value: str) -> str | None:
    clean = " ".join(value.strip().split())
    return clean or None


def _clean_value(value: str) -> str | None:
    clean = value.strip().replace("<", "")
    return clean or None


def _normalize_sex(raw: str) -> str | None:
    value = raw.strip().upper()
    if value in {"M", "F", "X"}:
        return value
    return None


def _normalize_yyMMdd(raw: str) -> str | None:
    value = raw.strip()
    if not re.fullmatch(r"\d{6}", value):
        return None
    yy = int(value[0:2])
    mm = int(value[2:4])
    dd = int(value[4:6])
    if not (1 <= mm <= 12 and 1 <= dd <= 31):
        return None

    year = _resolve_century(yy, mm, dd)
    try:
        parsed = date(year, mm, dd)
    except ValueError:
        return None
    return parsed.isoformat()


def _resolve_century(yy: int, mm: int, dd: int) -> int:
    today = date.today()
    year_2000 = 2000 + yy
    year_1900 = 1900 + yy

    def safe_date(year: int) -> date | None:
        try:
            return date(year, mm, dd)
        except ValueError:
            return None

    d2000 = safe_date(year_2000)
    d1900 = safe_date(year_1900)
    if d2000 is None:
        return year_1900
    if d1900 is None:
        return year_2000

    # Prefer a plausible lifespan date for birth/expiry values.
    if today.year - 120 <= d1900.year <= today.year + 20:
        if today.year - 120 <= d2000.year <= today.year + 20:
            return year_2000 if abs((d2000 - today).days) <= abs((d1900 - today).days) else year_1900
        return year_1900
    return year_2000


def _check_digit_ok(data: str, check_char: str) -> bool:
    if not check_char:
        return False
    if check_char == "<":
        return False
    expected = _compute_check_digit(data)
    try:
        return int(check_char) == expected
    except ValueError:
        return False


def _compute_check_digit(data: str) -> int:
    weights = (7, 3, 1)
    total = 0
    for idx, char in enumerate(data):
        total += _mrz_value(char) * weights[idx % 3]
    return total % 10


def _mrz_value(char: str) -> int:
    if "0" <= char <= "9":
        return ord(char) - ord("0")
    if "A" <= char <= "Z":
        return ord(char) - ord("A") + 10
    return 0


def _normalize_td3_line(value: str) -> str:
    clean = re.sub(r"[^A-Z0-9<]", "", (value or "").strip().upper())
    if len(clean) >= 44:
        return clean[:44]
    return clean.ljust(44, "<")
