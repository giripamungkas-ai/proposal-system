#!/bin/bash
# LiteFS Health Check

check_service() {
    if systemctl is-active "$1" >/dev/null; then
        echo "✅ $1: Active"
    else
        echo "❌ $1: Inactive"
    fi
}

check_endpoint() {
    local endpoint=$1
    local name=$2
    if curl -s "http://localhost:$endpoint/health" >/dev/null; then
        echo "✅ $name: Healthy"
    else
        echo "❌ $name: Unhealthy"
    fi
}

echo "=== LiteFS Health Status ===="
check_service litefs-primary.service
check_service litefs-replica.service
check_endpoint 20202 "LiteFS Primary"
check_endpoint 20203 "LiteFS Replica"
echo "============================="
