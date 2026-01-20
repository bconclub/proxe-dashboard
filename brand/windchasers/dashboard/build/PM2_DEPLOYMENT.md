# PM2 Ecosystem Deployment Guide

This guide explains how to deploy and manage the Windchasers Dashboard and Web-Agent using PM2 ecosystem configuration.

## Overview

The `ecosystem.config.js` file manages both applications as separate processes:
- **Dashboard**: Port 3003, directory `/var/www/windchasers-proxe/`
- **Web-Agent**: Port 3001, directory `/var/www/windchasers-web-agent/`

## Benefits

✅ **Separate builds** - Each app builds independently  
✅ **Easy management** - Control both apps with single commands  
✅ **Isolated processes** - One app failure doesn't affect the other  
✅ **Unified logging** - View logs from both apps together or separately  
✅ **Independent scaling** - Scale each app independently if needed  

## Prerequisites

1. **PM2 installed** on VPS:
   ```bash
   npm install -g pm2
   ```

2. **Directories created** on VPS:
   ```bash
   mkdir -p /var/www/windchasers-proxe
   mkdir -p /var/www/windchasers-web-agent
   mkdir -p /var/www/windchasers-proxe/logs
   mkdir -p /var/www/windchasers-web-agent/logs
   ```

3. **Environment files** created:
   - `/var/www/windchasers-proxe/.env.local` (Dashboard)
   - `/var/www/windchasers-web-agent/.env.local` (Web-Agent)

## Initial Setup

### 1. Deploy Both Applications

The GitHub Actions workflows will automatically deploy:
- Dashboard changes → triggers `deploy-windchasers-dashboard.yml`
- Web-Agent changes → triggers `deploy-windchasers-web-agent.yml`

### 2. Start Both Apps with Ecosystem File

On the VPS, navigate to the dashboard directory and start:

```bash
cd /var/www/windchasers-proxe
pm2 start ecosystem.config.js
pm2 save
```

This will start both applications.

## PM2 Commands

### Start/Stop/Restart

```bash
# Start both apps
pm2 start ecosystem.config.js

# Restart both apps
pm2 restart ecosystem.config.js

# Stop both apps
pm2 stop ecosystem.config.js

# Delete both apps (removes from PM2)
pm2 delete ecosystem.config.js

# Restart all PM2 processes
pm2 restart all
```

### Individual App Control

```bash
# Restart only dashboard
pm2 restart windchasers-dashboard

# Restart only web-agent
pm2 restart windchasers-web-agent

# Stop only dashboard
pm2 stop windchasers-dashboard

# Stop only web-agent
pm2 stop windchasers-web-agent
```

### Monitoring

```bash
# View status of all apps
pm2 status

# View logs from both apps
pm2 logs

# View logs from specific app
pm2 logs windchasers-dashboard
pm2 logs windchasers-web-agent

# View last 100 lines
pm2 logs --lines 100

# Monitor in real-time
pm2 monit
```

### Logs

```bash
# View all logs
pm2 logs

# View dashboard logs only
pm2 logs windchasers-dashboard

# View web-agent logs only
pm2 logs windchasers-web-agent

# Clear all logs
pm2 flush

# Log files location:
# Dashboard: /var/www/windchasers-proxe/logs/
# Web-Agent: /var/www/windchasers-web-agent/logs/
```

## Deployment Workflow

### Automatic Deployment (GitHub Actions)

1. **Dashboard Deployment**:
   - Push to `production` or `main` branch
   - Changes in `brand/windchasers/dashboard/build/**`
   - Workflow: `deploy-windchasers-dashboard.yml`
   - Builds dashboard and restarts `windchasers-dashboard` process

2. **Web-Agent Deployment**:
   - Push to `production` or `main` branch
   - Changes in `brand/windchasers/web-agent/build/**`
   - Workflow: `deploy-windchasers-web-agent.yml`
   - Builds web-agent and restarts `windchasers-web-agent` process

### Manual Deployment

If you need to deploy manually:

```bash
# Dashboard
cd /var/www/windchasers-proxe
git pull  # or rsync files
npm ci
npm run build
pm2 restart windchasers-dashboard

# Web-Agent
cd /var/www/windchasers-web-agent
git pull  # or rsync files
npm ci
npm run build
pm2 restart windchasers-web-agent
```

## Environment Variables

### Dashboard (`.env.local` in `/var/www/windchasers-proxe/`)

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_WEB_AGENT_URL=http://localhost:3001
PORT=3003
```

### Web-Agent (`.env.local` in `/var/www/windchasers-web-agent/`)

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
```

## Troubleshooting

### App Not Starting

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs windchasers-dashboard --lines 50
pm2 logs windchasers-web-agent --lines 50

# Check if ports are in use
netstat -tlnp | grep :3003
netstat -tlnp | grep :3001

# Restart specific app
pm2 restart windchasers-dashboard
```

### Build Failures

```bash
# Check build logs in deployment workflow
# Or manually build:
cd /var/www/windchasers-proxe
npm run build

cd /var/www/windchasers-web-agent
npm run build
```

### Memory Issues

The ecosystem config sets `max_memory_restart: '1G'`. If apps exceed this, they'll auto-restart.

To increase:
```javascript
// In ecosystem.config.js
max_memory_restart: '2G'  // Increase limit
```

### Process Not Found

If PM2 says process not found:

```bash
# Delete and recreate
pm2 delete ecosystem.config.js
pm2 start ecosystem.config.js
pm2 save
```

## Auto-Start on Server Reboot

PM2 should auto-start if you've run `pm2 save`. To ensure:

```bash
# Generate startup script
pm2 startup

# Follow the instructions it outputs (usually involves sudo)
# Then save current process list
pm2 save
```

## Port Configuration

- **Dashboard**: Port 3003 (configured in ecosystem.config.js)
- **Web-Agent**: Port 3001 (configured in ecosystem.config.js)

Make sure these ports are:
1. Not blocked by firewall
2. Available (not used by other services)
3. Configured in your reverse proxy (Nginx) if using one

## Nginx Configuration Example

If using Nginx as reverse proxy:

```nginx
# Dashboard
server {
    listen 80;
    server_name proxe.windchasers.in;
    
    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Web-Agent (optional - if exposing separately)
server {
    listen 80;
    server_name widget.windchasers.in;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Summary

- ✅ **Separate builds** - Each app builds independently
- ✅ **Unified management** - Control both with ecosystem file
- ✅ **Easy commands** - `pm2 start/restart/stop ecosystem.config.js`
- ✅ **Individual control** - Can manage apps separately if needed
- ✅ **Better logging** - Unified or separate log viewing
- ✅ **Auto-restart** - Apps restart on failure or server reboot
