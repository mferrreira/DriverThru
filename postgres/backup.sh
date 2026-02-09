set -e

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M")
BACKUP_DIR="/backups"
FILENAME="driverthru_${TIMESTAMP}.sql"

echo "[INFO] Starting PostgreSQL backup..."
pg_dump -h db -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_DIR/$FILENAME"
echo "[INFO] Backup saved as $FILENAME"

sleep 86400