module.exports = {
  apps: [{
    name: 'dashboard',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/dashboard',
    env_file: '.env.local',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}

