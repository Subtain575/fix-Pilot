module.exports = {
  apps: [
    {
      name: 'service-backend-app',
      script: 'dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Restart configuration
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Advanced features
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Auto restart on file changes (disable in production)
      autorestart: true,
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Source map support
      source_map_support: true,
      
      // Merge logs from all instances
      merge_logs: true,
      
      // Time zone
      time: true,
    }
  ],

  deploy: {
    production: {
      user: 'root',
      host: process.env.VPS_HOST || 'your-vps-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/service-backend-app.git',
      path: '/var/www/service-backend-app',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};