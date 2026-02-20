#!/bin/sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$SCRIPT_DIR/backups"
ENV_FILE="$ROOT_DIR/.env"
DB_SERVICE="db"
BACKUP_FILE=""
AUTO_YES=false
LIST_ONLY=false

usage() {
  cat <<'EOF'
Usage:
  ./postgres/restore.sh [options]

Options:
  -f, --file <path>      Restore from a specific .sql file.
  -l, --latest           Restore from latest backup in postgres/backups.
      --list             List available backup files and exit.
  -s, --service <name>   Docker Compose DB service (default: db).
  -y, --yes              Skip confirmation prompt.
  -h, --help             Show this help.

Examples:
  ./postgres/restore.sh --latest
  ./postgres/restore.sh --file ./postgres/backups/driverthru_2026-02-20_11-22.sql
EOF
}

list_backups() {
  if [ ! -d "$BACKUP_DIR" ]; then
    echo "[ERROR] Backup directory not found: $BACKUP_DIR" >&2
    exit 1
  fi
  ls -lh "$BACKUP_DIR"/driverthru_*.sql 2>/dev/null || echo "No backups found."
}

latest_backup() {
  ls -1t "$BACKUP_DIR"/driverthru_*.sql 2>/dev/null | head -n 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    -f|--file)
      BACKUP_FILE="${2:-}"
      shift 2
      ;;
    -l|--latest)
      BACKUP_FILE="$(latest_backup)"
      shift
      ;;
    --list)
      LIST_ONLY=true
      shift
      ;;
    -s|--service)
      DB_SERVICE="${2:-}"
      shift 2
      ;;
    -y|--yes)
      AUTO_YES=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [ "$LIST_ONLY" = true ]; then
  list_backups
  exit 0
fi

if [ -z "$BACKUP_FILE" ]; then
  BACKUP_FILE="$(latest_backup)"
fi

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "[ERROR] Backup file not found. Use --list to inspect available backups." >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "[ERROR] .env not found at $ENV_FILE" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] docker command not found." >&2
  exit 1
fi

if ! docker compose ps "$DB_SERVICE" >/dev/null 2>&1; then
  echo "[ERROR] Docker Compose service '$DB_SERVICE' not found/running." >&2
  exit 1
fi

POSTGRES_DB="$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | tail -n1 | cut -d= -f2-)"
POSTGRES_USER="$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | tail -n1 | cut -d= -f2-)"

if [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ]; then
  echo "[ERROR] POSTGRES_DB/POSTGRES_USER not found in .env" >&2
  exit 1
fi

echo "[WARN] This will restore backup into service '$DB_SERVICE' database '$POSTGRES_DB'."
echo "[INFO] Backup file: $BACKUP_FILE"

if [ "$AUTO_YES" != true ]; then
  printf "Type 'restore' to continue: "
  read -r CONFIRM
  if [ "$CONFIRM" != "restore" ]; then
    echo "[INFO] Restore cancelled."
    exit 0
  fi
fi

echo "[INFO] Restoring backup..."
cat "$BACKUP_FILE" | docker compose exec -T "$DB_SERVICE" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null
echo "[INFO] Restore completed successfully."
