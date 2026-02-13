from __future__ import annotations

import enum


class AddressType(str, enum.Enum):
    RESIDENTIAL = "residential"
    MAILING = "mailing"
    OUT_OF_STATE = "out_of_state"


class Gender(str, enum.Enum):
    FEMALE = "female"
    MALE = "male"
    NON_BINARY = "non_binary"
    UNDISCLOSED = "undisclosed"


class NJLicenseClass(str, enum.Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"
    I = "I"


class NJEndorsementCode(str, enum.Enum):
    M = "M"
    F = "F"
    H = "H"
    N = "N"
    P = "P"
    S = "S"
    T = "T"
    X = "X"


class NJRestrictionCode(str, enum.Enum):
    ONE = "1"
    TWO = "2"
    THREE = "3"
    FOUR = "4"
    L = "L"
    P = "P"
