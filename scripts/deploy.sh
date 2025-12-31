#!/bin/bash

# Service Backend App Deployment Script
# This script sets up and deploys the application on VPS

set -e  # Exit on any error

# Configuration
APP_NAME="service-backend-app"
APP_DIR="/var/www/$APP_NAME"
BACKUP_DIR="$APP_DIR/backups"
LOG_FILE="/var/log/$APP_NAME-deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a $LOG_FILE
    exit 1
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a $LOG_FILE
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        warning "Running as root. Consider using a non-root user for security."
    fi
}

# Install system dependencies
install_dependencies() {
    log "Installing system dependencies..."
    
    # Update package list
    apt-get update
    
    # Install Node.js 20.x
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
    
    # Install PM2 globally
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi
    
    # Install other dependencies
    apt-get install -y nginx git curl wget unzip
    
    log "Dependencies installed successfully"
}

# Setup application directory
setup_app_directory() {
    log "Setting up application directory..."
    
    # Create directories
    mkdir -p $APP_DIR
    mkdir -p $BACKUP_DIR
    mkdir -p $APP_DIR/logs
    
    # Set permissions
    chown -R $USER:$USER $APP_DIR
    chmod -R 755 $APP_DIR
    
    log "Application directory setup complete"
}

# Setup Nginx configuration
setup_nginx() {
    log "Setting up Nginx configuration..."
    
    cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API documentation
    location /api/docs {
        proxy_pass http://localhost:3000/api/docs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
EOF
    
    # Enable site
    ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    nginx -t
    
    # Restart nginx
    systemctl restart nginx
    systemctl enable nginx
    
    log "Nginx configuration setup complete"
}

# Deploy application
deploy_app() {
    log "Deploying application..."
    
    cd $APP_DIR
    
    # Stop application if running
    pm2 stop $APP_NAME || true
    
    # Create backup of current deployment
    if [ -d "current" ]; then
        BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
        mv current $BACKUP_DIR/$BACKUP_NAME
        log "Created backup: $BACKUP_NAME"
    fi
    
    # Create new deployment directory
    mkdir -p current
    cd current
    
    # Extract deployment package (this will be done by GitHub Actions)
    # npm ci --only=production
    # npm run build
    
    log "Application deployed successfully"
}

# Start application
start_app() {
    log "Starting application..."
    
    cd $APP_DIR/current
    
    # Start with PM2
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    pm2 startup systemd -u $USER --hp /home/$USER
    
    log "Application started successfully"
}

# Cleanup old backups
cleanup_backups() {
    log "Cleaning up old backups..."
    
    # Keep only last 5 backups
    cd $BACKUP_DIR
    ls -t | tail -n +6 | xargs rm -rf || true
    
    log "Backup cleanup complete"
}

# Health check
health_check() {
    log "Performing health check..."
    
    sleep 10  # Wait for app to start
    
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log "Health check passed"
    else
        error "Health check failed"
    fi
}

# Main deployment function
main() {
    log "Starting deployment process..."
    
    check_root
    install_dependencies
    setup_app_directory
    setup_nginx
    deploy_app
    start_app
    cleanup_backups
    health_check
    
    log "Deployment completed successfully!"
    log "Application is running at: http://your-domain.com"
    log "API Documentation: http://your-domain.com/api/docs"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi