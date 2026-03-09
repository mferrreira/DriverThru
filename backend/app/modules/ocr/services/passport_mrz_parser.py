from __future__ import annotations

from dataclasses import dataclass
from datetime import date
import re
from typing import Literal


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
            repaired_line1 = _repair_td3_line1_if_truncated(first)
            repaired_line2 = _repair_td3_line2_if_missing_passport_check_digit(second)
            repaired_line2 = _repair_td3_line2_if_overlong_by_one(repaired_line2)
            repaired_line2 = _repair_td3_line2_if_truncated_optional_zone(repaired_line2)
            return [repaired_line1, repaired_line2]

    return []


def parse_passport_mrz(lines: list[str]) -> ParsedPassportMrz | None:
    if len(lines) != 2:
        return None

    line1 = _normalize_td3_line(lines[0])
    line2 = _normalize_td3_line(lines[1])
    problems = validate_td3_mrz_lines([line1, line2])
    if _has_fatal_td3_problems(problems):
        return None

    fallback_parsed = _parse_td3_fallback(line1, line2)
    library_parsed = _parse_with_mrz_library(line1, line2)
    parsed = _merge_library_and_fallback(library_parsed, fallback_parsed)
    if parsed is None:
        return None
    if not _parsed_passport_semantics_ok(parsed):
        return None
    return parsed


def validate_td3_mrz_lines(lines: list[str]) -> list[str]:
    problems: list[str] = []
    if len(lines) != 2:
        return ["MRZ must contain exactly 2 lines."]

    line1 = (lines[0] or "").strip().upper()
    line2 = (lines[1] or "").strip().upper()

    if len(line1) not in {43, 44} or len(line2) not in {43, 44}:
        problems.append("MRZ lines must be 43 or 44 characters.")
    if not re.fullmatch(r"[A-Z0-9<]+", line1 or ""):
        problems.append("MRZ line 1 contains invalid characters.")
    if not re.fullmatch(r"[A-Z0-9<]+", line2 or ""):
        problems.append("MRZ line 2 contains invalid characters.")
    if not line1.startswith("P<"):
        problems.append("MRZ line 1 must start with 'P<'.")
    if len(line2) < 28:
        problems.append("MRZ line 2 is too short for mandatory TD3 fields.")
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
    # The mrz library expects strict TD3 (44/44). OCR commonly drops trailing '<',
    # so we fallback to manual parsing when a line has 43 chars.
    if len(line1) != 44 or len(line2) != 44:
        return None

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
    birth_date = _normalize_yyMMdd(str(fields.get("birth_date", "")).replace("<", ""), kind="birth")
    expiration_date = _normalize_yyMMdd(str(fields.get("expiration_date", "")).replace("<", ""), kind="expiry")
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
        birth_date=_normalize_yyMMdd(line2[13:19], kind="birth"),
        expiration_date=_normalize_yyMMdd(line2[21:27], kind="expiry"),
        sex=_normalize_sex(line2[20:21]),
    )


def _merge_library_and_fallback(
    library_parsed: ParsedPassportMrz | None,
    fallback_parsed: ParsedPassportMrz | None,
) -> ParsedPassportMrz | None:
    if library_parsed is None:
        return fallback_parsed
    if fallback_parsed is None:
        return library_parsed
    return ParsedPassportMrz(
        document_type=library_parsed.document_type or fallback_parsed.document_type,
        issuing_country=library_parsed.issuing_country or fallback_parsed.issuing_country,
        passport_number=library_parsed.passport_number or fallback_parsed.passport_number,
        nationality=library_parsed.nationality or fallback_parsed.nationality,
        surname=library_parsed.surname or fallback_parsed.surname,
        given_names=library_parsed.given_names or fallback_parsed.given_names,
        birth_date=library_parsed.birth_date or fallback_parsed.birth_date,
        expiration_date=library_parsed.expiration_date or fallback_parsed.expiration_date,
        sex=library_parsed.sex or fallback_parsed.sex,
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


def _normalize_yyMMdd(raw: str, *, kind: Literal["birth", "expiry"]) -> str | None:
    value = raw.strip()
    if not re.fullmatch(r"\d{6}", value):
        return None
    yy = int(value[0:2])
    mm = int(value[2:4])
    dd = int(value[4:6])
    if not (1 <= mm <= 12 and 1 <= dd <= 31):
        return None

    year = _resolve_century(yy, mm, dd, kind=kind)
    try:
        parsed = date(year, mm, dd)
    except ValueError:
        return None
    return parsed.isoformat()


def _resolve_century(yy: int, mm: int, dd: int, *, kind: Literal["birth", "expiry"]) -> int:
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

    if kind == "birth":
        min_year = today.year - 120
        max_year = today.year
    else:
        min_year = today.year - 20
        max_year = today.year + 20

    in_range_1900 = min_year <= d1900.year <= max_year
    in_range_2000 = min_year <= d2000.year <= max_year
    if in_range_1900 and not in_range_2000:
        return year_1900
    if in_range_2000 and not in_range_1900:
        return year_2000
    if in_range_1900 and in_range_2000:
        if kind == "birth":
            return year_1900
        return year_2000
    return year_1900 if abs(d1900.year - today.year) <= abs(d2000.year - today.year) else year_2000


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
    return re.sub(r"[^A-Z0-9<]", "", (value or "").strip().upper())


def _repair_td3_line1_if_truncated(line1: str) -> str:
    if line1.startswith("P<") and 40 <= len(line1) <= 43 and line1.endswith("<"):
        return line1.ljust(44, "<")
    return line1


def _repair_td3_line2_if_missing_passport_check_digit(line2: str) -> str:
    if len(line2) != 43:
        return line2
    if not re.fullmatch(r"[A-Z0-9<]{43}", line2):
        return line2
    # Common OCR loss: one char after passport number, shifting issuing country left.
    if line2[9:12].isalpha() and not line2[9].isdigit():
        check_digit = str(_compute_check_digit(line2[0:9]))
        candidate = f"{line2[:9]}{check_digit}{line2[9:]}"
        if (
            len(candidate) == 44
            and _check_digit_ok(candidate[0:9], candidate[9])
            and _check_digit_ok(candidate[13:19], candidate[19])
            and _check_digit_ok(candidate[21:27], candidate[27])
        ):
            return candidate
    return line2


def _repair_td3_line2_if_truncated_optional_zone(line2: str) -> str:
    if len(line2) >= 44 or len(line2) < 40:
        return line2
    if not re.fullmatch(r"[A-Z0-9<]+", line2):
        return line2
    # Only repair when fixed fields up to expiry check digit look aligned.
    fixed_segment_ok = bool(re.fullmatch(r"[A-Z0-9<]{9}[0-9<][A-Z]{3}[0-9]{6}[0-9<][MFX<][0-9]{6}[0-9<]", line2[:28]))
    if not fixed_segment_ok:
        return line2
    return line2.ljust(44, "<")


def _repair_td3_line2_if_overlong_by_one(line2: str) -> str:
    if len(line2) != 45:
        return line2
    if not re.fullmatch(r"[A-Z0-9<]{45}", line2):
        return line2
    fixed_segment_ok = bool(re.fullmatch(r"[A-Z0-9<]{9}[0-9<][A-Z]{3}[0-9]{6}[0-9<][MFX<][0-9]{6}[0-9<]", line2[:28]))
    if not fixed_segment_ok:
        return line2

    candidates: list[str] = []
    if line2[-1] == "<":
        candidates.append(line2[:-1])
    if line2[-3] == "<":
        candidates.append(f"{line2[:-3]}{line2[-2:]}")
    candidates.append(f"{line2[:-2]}{line2[-1:]}")

    for candidate in candidates:
        if (
            len(candidate) == 44
            and _check_digit_ok(candidate[0:9], candidate[9])
            and _check_digit_ok(candidate[13:19], candidate[19])
            and _check_digit_ok(candidate[21:27], candidate[27])
        ):
            return candidate
    return line2


def _has_fatal_td3_problems(problems: list[str]) -> bool:
    return any("check digit" not in problem.lower() for problem in problems)


def _parsed_passport_semantics_ok(parsed: ParsedPassportMrz) -> bool:
    today = date.today()
    min_birth = _shift_year(today, -120)
    min_expiry = _shift_year(today, -20)
    max_expiry = _shift_year(today, 20)

    birth: date | None = None
    expiry: date | None = None

    if parsed.birth_date:
        try:
            birth = date.fromisoformat(parsed.birth_date)
        except ValueError:
            return False
        if birth > today:
            return False
        if birth < min_birth:
            return False

    if parsed.expiration_date:
        try:
            expiry = date.fromisoformat(parsed.expiration_date)
        except ValueError:
            return False
        if expiry < min_expiry:
            return False
        if expiry > max_expiry:
            return False

    if birth is not None and expiry is not None and expiry <= birth:
        return False

    return True


def _shift_year(value: date, delta_years: int) -> date:
    target_year = value.year + delta_years
    if value.month == 2 and value.day == 29:
        return date(target_year, 2, 28)
    return date(target_year, value.month, value.day)
