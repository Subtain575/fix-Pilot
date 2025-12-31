# Deployment Guide - Service Backend App

This guide covers the complete deployment process for the Service Backend App on a VPS using GitHub Actions CI/CD.

## 🚀 Quick Start

### Prerequisites
- Ubuntu/Debian VPS with root access
- Domain name (optional but recommended)
- GitHub repository
- Node.js 20.x
- PostgreSQL database

### 1. VPS Setup

#### Initial Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y
```

#### Database Setup
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE service_backend_prod;
CREATE USER your_db_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE service_backend_prod TO your_db_user;
\q
```

### 2. GitHub Secrets Configuration

Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

```
VPS_HOST=your-server-ip-or-domain
VPS_USERNAME=your-username
VPS_SSH_KEY=your-private-ssh-key
VPS_PORT=22
```

#### Generate SSH Key (if needed)
```bash
# On your local machine
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Copy public key to VPS
ssh-copy-id username@your-vps-ip

# Copy private key content to GitHub secret VPS_SSH_KEY
cat ~/.ssh/id_rsa
```

### 3. VPS Application Setup

#### Create Application Directory
```bash
sudo mkdir -p /var/www/service-backend-app
sudo chown -R $USER:$USER /var/www/service-backend-app
cd /var/www/service-backend-app
```

#### Environment Configuration
```bash
# Copy production environment template
cp .env.production .env

# Edit environment variables
nano .env
```

Update these values in `.env`:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=service_backend_prod

# JWT
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters

# Mail (Gmail)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=your-email@gmail.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Nginx Configuration

#### Create Nginx Site Configuration
```bash
sudo nano /etc/nginx/sites-available/service-backend-app
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # API documentation
    location /api/docs {
        proxy_pass http://localhost:3000/api/docs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
```

#### Enable Site
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/service-backend-app /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 5. SSL Certificate (Optional but Recommended)

#### Using Certbot (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

### 6. PM2 Setup

#### Configure PM2 Startup
```bash
# Setup PM2 to start on boot
pm2 startup systemd

# Follow the instructions provided by the command above
```

### 7. Deployment Process

#### Manual First Deployment
```bash
cd /var/www/service-backend-app

# Clone repository (first time only)
git clone https://github.com/your-username/service-backend-app.git current
cd current

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
```

#### Automated Deployment (GitHub Actions)
Once configured, every push to `main` branch will:
1. Run tests
2. Build application
3. Deploy to VPS
4. Restart application
5. Perform health checks

## 📊 Monitoring & Health Checks

### Health Endpoints
- Basic health: `GET /health`
- Detailed health: `GET /health/detailed`

### PM2 Monitoring
```bash
# View application status
pm2 status

# View logs
pm2 logs service-backend-app

# Monitor in real-time
pm2 monit

# Restart application
pm2 restart service-backend-app
```

### Manual Health Check Script
```bash
# Run health check
./scripts/health-check.sh

# Verbose mode
./scripts/health-check.sh -v

# Quiet mode (errors only)
./scripts/health-check.sh -q
```

## 🔧 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check PM2 logs
pm2 logs service-backend-app

# Check environment variables
pm2 env 0

# Restart application
pm2 restart service-backend-app
```

#### Database Connection Issues
```bash
# Test database connection
psql -h localhost -U your_db_user -d service_backend_prod

# Check database service
sudo systemctl status postgresql
```

#### Nginx Issues
```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

#### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew
```

### Log Locations
- Application logs: `/var/www/service-backend-app/current/logs/`
- PM2 logs: `~/.pm2/logs/`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/syslog`

## 🔄 Rollback Process

### Manual Rollback
```bash
cd /var/www/service-backend-app

# Stop current application
pm2 stop service-backend-app

# Switch to backup
mv current current-failed
mv backup-YYYYMMDD-HHMMSS current

# Restart application
cd current
pm2 start ecosystem.config.js --env production
```

### Automated Rollback
The deployment script automatically creates backups. In case of failure:
1. GitHub Actions will fail
2. Previous version remains running
3. Manual intervention required for rollback

## 📈 Performance Optimization

### PM2 Cluster Mode
The application runs in cluster mode with maximum instances for better performance.

### Nginx Optimizations
- Gzip compression enabled
- Security headers configured
- Proxy buffering optimized

### Database Optimizations
- Connection pooling configured
- Query optimization recommended
- Regular maintenance scheduled

## 🔐 Security Considerations

### Environment Variables
- Never commit `.env` files
- Use strong passwords and secrets
- Rotate secrets regularly

### Server Security
- Keep system updated
- Configure firewall
- Use SSH keys instead of passwords
- Regular security audits

### Application Security
- CORS properly configured
- Rate limiting implemented
- Input validation enabled
- Security headers set

## 📞 Support

For deployment issues:
1. Check logs first
2. Run health checks
3. Verify configuration
4. Contact system administrator

---

**Last Updated:** January 2024
**Version:** 1.0.0