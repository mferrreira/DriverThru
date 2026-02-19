from __future__ import annotations

import argparse
import getpass
import json
import os
from pathlib import Path
import re
import sys

from argon2 import PasswordHasher

password_hasher = PasswordHasher()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create or update an auth user in AUTH_USERS_JSON.")
    parser.add_argument("--username", required=True, help="Username to create/update.")
    parser.add_argument("--role", default="operator", help="Role for the user (default: operator).")
    parser.add_argument(
        "--password",
        default=None,
        help="Plain password. If omitted, CLI will prompt securely.",
    )
    parser.add_argument(
        "--write-env",
        default=None,
        help="Path to .env file to update AUTH_USERS_JSON in place (default: backend/../.env).",
    )
    parser.add_argument(
        "--print-only",
        action="store_true",
        help="Only print AUTH_USERS_JSON result; do not write .env.",
    )
    return parser.parse_args()


def resolve_env_path(raw_path: str | None) -> Path:
    if raw_path:
        return Path(raw_path).expanduser().resolve()
    return (Path(__file__).resolve().parent.parent / ".." / ".env").resolve()


def load_users(env_path: Path) -> list[dict[str, str]]:
    auth_json = _read_auth_users_json(env_path)
    try:
        raw = json.loads(auth_json)
    except json.JSONDecodeError as exc:
        raise ValueError("AUTH_USERS_JSON is not valid JSON.") from exc
    if not isinstance(raw, list):
        raise ValueError("AUTH_USERS_JSON must be a JSON array.")

    users: list[dict[str, str]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        username = str(item.get("username", "")).strip()
        password = str(item.get("password", "")).strip()
        role = str(item.get("role", "operator")).strip() or "operator"
        if username and password:
            users.append({"username": username, "password": password, "role": role})
    return users


def upsert_user(users: list[dict[str, str]], username: str, role: str, password: str) -> list[dict[str, str]]:
    hashed_password = password_hasher.hash(password)
    updated: list[dict[str, str]] = []
    replaced = False

    for user in users:
        if user["username"] == username:
            updated.append({"username": username, "password": hashed_password, "role": role})
            replaced = True
        else:
            updated.append(user)

    if not replaced:
        updated.append({"username": username, "password": hashed_password, "role": role})
    return updated


def render_auth_users_json(users: list[dict[str, str]]) -> str:
    return json.dumps(users, ensure_ascii=True, separators=(",", ":"))


def _read_auth_users_json(env_path: Path) -> str:
    if env_path.exists():
        content = env_path.read_text(encoding="utf-8")
        match = re.search(r"^AUTH_USERS_JSON=(.*)$", content, flags=re.MULTILINE)
        if match:
            return match.group(1).strip()

    env_value = os.getenv("AUTH_USERS_JSON", "").strip()
    if env_value:
        return env_value

    # Safe default when no config exists yet.
    return "[]"


def write_env_file(env_path: Path, auth_users_json: str) -> None:
    line = f"AUTH_USERS_JSON={auth_users_json}"
    if env_path.exists():
        content = env_path.read_text(encoding="utf-8")
        pattern = re.compile(r"^AUTH_USERS_JSON=.*$", re.MULTILINE)
        if pattern.search(content):
            updated = pattern.sub(line, content)
        else:
            updated = f"{content.rstrip()}\n{line}\n"
    else:
        updated = f"{line}\n"
    env_path.write_text(updated, encoding="utf-8")


def main() -> int:
    args = parse_args()
    username = args.username.strip()
    role = args.role.strip() or "operator"
    if not username:
        print("Username cannot be empty.", file=sys.stderr)
        return 1

    password = args.password
    if password is None:
        password = getpass.getpass("Password: ")
    if not password:
        print("Password cannot be empty.", file=sys.stderr)
        return 1

    env_path = resolve_env_path(args.write_env)
    users = load_users(env_path=env_path)
    users = upsert_user(users=users, username=username, role=role, password=password)
    auth_users_json = render_auth_users_json(users)

    if args.print_only:
        print("AUTH_USERS_JSON=" + auth_users_json)
    else:
        write_env_file(env_path=env_path, auth_users_json=auth_users_json)
        print(f"Updated AUTH_USERS_JSON in {env_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
