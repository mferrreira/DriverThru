from __future__ import annotations

import argparse
import getpass
import json
from pathlib import Path
import re
import sys

CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = CURRENT_DIR.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import settings
from app.core.security import password_hasher


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
        help="Optional path to .env file to update AUTH_USERS_JSON in place.",
    )
    return parser.parse_args()


def load_users() -> list[dict[str, str]]:
    try:
        raw = json.loads(settings.AUTH_USERS_JSON)
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

    users = load_users()
    users = upsert_user(users=users, username=username, role=role, password=password)
    auth_users_json = render_auth_users_json(users)

    if args.write_env:
        env_path = Path(args.write_env).expanduser().resolve()
        write_env_file(env_path=env_path, auth_users_json=auth_users_json)
        print(f"Updated AUTH_USERS_JSON in {env_path}")
    else:
        print("AUTH_USERS_JSON=" + auth_users_json)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
