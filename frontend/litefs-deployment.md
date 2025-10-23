# 🗄️ LiteFS High Availability Deployment Guide

## 🚀 Quick Start

1. Upload all files to VPS:
   - litefs-primary.yml -> /etc/litefs/
   - litefs-replica.yml -> /etc/litefs/
   - litefs-primary.service -> /etc/systemd/system/
   - litefs-replica.service -> /etc/systemd/system/
   - setup-litefs.sh -> /root/
   - check-litefs.sh -> /usr/local/bin/
   - .env.litefs -> /path/to/app/

2. Run setup script:
   sudo bash setup-litefs.sh

3. Start services:
   sudo systemctl start litefs-primary.service
   sudo systemctl start litefs-replica.service

4. Check status:
   sudo bash check-litefs.sh

## 📊 Architecture

- **Primary Node**: /data/litefs-primary/db.sqlite (port 20202)
- **Replica Node**: /data/litefs-replica/db.sqlite (port 20203)
- **Mount Points**: /mnt/litefs-primary, /mnt/litefs-replica
- **Replication**: Auto-sync every 1 second
- **Failover**: Automatic switch when primary fails

## 🔧 Maintenance

### Start Services:
systemctl start litefs-primary.service
systemctl start litefs-replica.service

### Stop Services:
systemctl stop litefs-replica.service
systemctl stop litefs-primary.service

### Restart Services:
systemctl restart litefs-replica.service
systemctl restart litefs-primary.service

### Enable Auto-start:
systemctl enable litefs-primary.service
systemctl enable litefs-replica.service

### Check Health:
bash check-litefs.sh
curl http://localhost:20202/health
curl http://localhost:20203/health

### Backup:
cp /data/litefs-primary/db.sqlite /data/litefs-primary/backups/db_$(date +