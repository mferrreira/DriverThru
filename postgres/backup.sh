#!/bin/sh
set -e

BACKUP_DIR="/backups"
INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
KEEP_FILES="${BACKUP_KEEP_FILES:-15}"

mkdir -p "$BACKUP_DIR"

while true; do
  TIMESTAMP=$(date +"%Y-%m-%d_%H-%M")
  FILENAME="driverthru_${TIMESTAMP}.sql"

  echo "[INFO] Starting PostgreSQL backup..."
  pg_dump -h db -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_DIR/$FILENAME"
  echo "[INFO] Backup saved as $BACKUP_DIR/$FILENAME"

  # Keep only the most recent backup files.
  if [ "$KEEP_FILES" -gt 0 ] 2>/dev/null; then
    ls -1t "$BACKUP_DIR"/driverthru_*.sql 2>/dev/null | tail -n +$((KEEP_FILES + 1)) | xargs -r rm -f
  fi

  sleep "$INTERVAL_SECONDS"
done
