#!/bin/sh
set -e

# Tự sinh userlist.txt từ env vars (không hardcode password)
cat > /etc/pgbouncer/userlist.txt << EOF
"${POSTGRES_USER}" "${POSTGRES_PASSWORD}"
EOF

chmod 600 /etc/pgbouncer/userlist.txt

echo "[pgbouncer] Starting with pool_size=25, max_client_conn=1000"
exec pgbouncer /etc/pgbouncer/pgbouncer.ini
