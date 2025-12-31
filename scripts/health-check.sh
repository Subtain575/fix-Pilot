#!/bin/bash

# Health Check Script for Service Backend App
# This script monitors the application health and can be used for automated monitoring

set -e

# Configuration
APP_NAME="service-backend-app"
APP_URL="http://localhost:3000"
HEALTH_ENDPOINT="$APP_URL/health"
LOG_FILE="/var/log/$APP_NAME-health.log"
MAX_RETRIES=3
RETRY_DELAY=5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a $LOG_FILE
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a $LOG_FILE
}

# Check if application is running
check_process() {
    if pm2 list | grep -q "$APP_NAME.*online"; then
        log "PM2 process is running"
        return 0
    else
        error "PM2 process is not running"
        return 1
    fi
}

# Check HTTP endpoint
check_http() {
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        if curl -f -s -o /dev/null -w "%{http_code}" "$HEALTH_ENDPOINT" | grep -q "200"; then
            log "HTTP health check passed"
            return 0
        else
            retry_count=$((retry_count + 1))
            warning "HTTP health check failed (attempt $retry_count/$MAX_RETRIES)"
            
            if [ $retry_count -lt $MAX_RETRIES ]; then
                sleep $RETRY_DELAY
            fi
        fi
    done
    
    error "HTTP health check failed after $MAX_RETRIES attempts"
    return 1
}

# Check database connectivity
check_database() {
    # This would need to be customized based on your database setup
    log "Database connectivity check (implement based on your DB)"
    return 0
}

# Check disk space
check_disk_space() {
    local usage=$(df /var/www | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ $usage -gt 90 ]; then
        error "Disk usage is critical: ${usage}%"
        return 1
    elif [ $usage -gt 80 ]; then
        warning "Disk usage is high: ${usage}%"
    else
        log "Disk usage is normal: ${usage}%"
    fi
    
    return 0
}

# Check memory usage
check_memory() {
    local memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    
    if [ $memory_usage -gt 90 ]; then
        error "Memory usage is critical: ${memory_usage}%"
        return 1
    elif [ $memory_usage -gt 80 ]; then
        warning "Memory usage is high: ${memory_usage}%"
    else
        log "Memory usage is normal: ${memory_usage}%"
    fi
    
    return 0
}

# Restart application if needed
restart_app() {
    log "Attempting to restart application..."
    
    pm2 restart $APP_NAME
    
    # Wait for restart
    sleep 10
    
    if check_process && check_http; then
        log "Application restarted successfully"
        return 0
    else
        error "Application restart failed"
        return 1
    fi
}

# Send notification (customize based on your notification system)
send_notification() {
    local message="$1"
    local severity="$2"
    
    # Example: Send to Slack, Discord, email, etc.
    # curl -X POST -H 'Content-type: application/json' \
    #     --data "{\"text\":\"[$severity] $APP_NAME: $message\"}" \
    #     YOUR_WEBHOOK_URL
    
    log "Notification: [$severity] $message"
}

# Main health check function
main() {
    log "Starting health check..."
    
    local failed_checks=0
    
    # Check PM2 process
    if ! check_process; then
        failed_checks=$((failed_checks + 1))
    fi
    
    # Check HTTP endpoint
    if ! check_http; then
        failed_checks=$((failed_checks + 1))
    fi
    
    # Check system resources
    if ! check_disk_space; then
        failed_checks=$((failed_checks + 1))
    fi
    
    if ! check_memory; then
        failed_checks=$((failed_checks + 1))
    fi
    
    # Check database (if applicable)
    if ! check_database; then
        failed_checks=$((failed_checks + 1))
    fi
    
    # Handle failures
    if [ $failed_checks -gt 0 ]; then
        error "Health check failed ($failed_checks issues found)"
        
        # Try to restart if process or HTTP checks failed
        if [ $failed_checks -le 2 ]; then
            restart_app
            if [ $? -eq 0 ]; then
                send_notification "Application was unhealthy but successfully restarted" "WARNING"
                exit 0
            fi
        fi
        
        send_notification "Application health check failed with $failed_checks issues" "CRITICAL"
        exit 1
    else
        log "All health checks passed"
        exit 0
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -v, --verbose  Verbose output"
    echo "  -q, --quiet    Quiet mode (errors only)"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -v|--verbose)
            set -x
            shift
            ;;
        -q|--quiet)
            exec > /dev/null 2>&1
            shift
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main function
main "$@"