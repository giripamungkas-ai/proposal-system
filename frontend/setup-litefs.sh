#!/bin/bash
# 🚀 LiteFS Complete VPS Setup Script

echo "🔧 Starting LiteFS HA Setup..."

# Create directories
mkdir -p /etc/litefs /data/litefs-primary /data/litefs-replica /mnt/litefs-primary /mnt/litefs-replica /data/litefs-primary/backups

# Create litefs user
if ! id "litefs" &>/dev/null; then
    useradd -r -s /bin/bash -d /data/litefs litefs
fi

# Copy configuration files
cp litefs-primary.yml /etc/litefs/
cp litefs-replica.yml /etc/litefs/
cp litefs-primary.service /etc/systemd/system/
cp litefs-replica.service /etc/systemd/system/

# Set permissions
chown -R litefs:litefs /etc/litefs /data/litefs-*
chmod 750 /etc/litefs /data/litefs-*
chmod 755 /mnt/litefs-*

# Enable services
systemctl daemon-reload
systemctl enable litefs-primary.service litefs-replica.service

echo "✅ LiteFS setup completed! Use: systemctl start litefs-primary.service"
