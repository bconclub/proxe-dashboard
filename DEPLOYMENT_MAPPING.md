# Windchasers Deployment Mapping

## Overview

This document clarifies what code goes where and which domain serves what.

## Directory Structure

### Dashboard (Windchasers Dashboard)
- **Source Code:** `brand/windchasers/dashboard/build/`
- **VPS Directory:** `/var/www/windchasers-proxe/`
- **Domain:** `proxe.windchasers.in`
- **Port:** `3003`
- **PM2 Process:** `windchasers-dashboard`
- **Workflow:** `.github/workflows/deploy-windchasers-dashboard.yml`

### Web-Agent (Windchasers Web-Agent)
- **Source Code:** `brand/windchasers/web-agent/build/`
- **VPS Directory:** `/var/www/windchasers-web-agent/`
- **Domain:** `pilot.windchasers.in`
- **Port:** `3001`
- **PM2 Process:** `windchasers-web-agent`
- **Workflow:** `.github/workflows/deploy-windchasers-web-agent.yml`

## Deployment Flow

### Dashboard Deployment
1. Code in `brand/windchasers/dashboard/build/` is pushed
2. GitHub Actions workflow `deploy-windchasers-dashboard.yml` triggers
3. Files are rsynced to `/var/www/windchasers-proxe/` on VPS
4. Build runs on VPS
5. PM2 starts/restarts `windchasers-dashboard` on port 3003
6. Nginx at `proxe.windchasers.in` proxies to `localhost:3003`

### Web-Agent Deployment
1. Code in `brand/windchasers/web-agent/build/` is pushed
2. GitHub Actions workflow `deploy-windchasers-web-agent.yml` triggers
3. Files are rsynced to `/var/www/windchasers-web-agent/` on VPS
4. Build runs on VPS
5. PM2 starts/restarts `windchasers-web-agent` on port 3001
6. Nginx at `pilot.windchasers.in` proxies to `localhost:3001`

## Domain Configuration

### proxe.windchasers.in
- **Serves:** Windchasers Dashboard
- **Backend:** `/var/www/windchasers-proxe/` (port 3003)
- **Nginx Config:** `/etc/nginx/sites-available/proxe.windchasers.in`
- **Purpose:** Main dashboard application

### pilot.windchasers.in
- **Serves:** Windchasers Web-Agent (Widget)
- **Backend:** `/var/www/windchasers-web-agent/` (port 3001)
- **Nginx Config:** `/etc/nginx/sites-available/pilot.windchasers.in`
- **Purpose:** Chat widget that can be embedded on websites

## Environment Variables

### Dashboard (.env.local in `/var/www/windchasers-proxe/`)
```env
# Dashboard runs on proxe.windchasers.in
NEXT_PUBLIC_APP_URL=https://proxe.windchasers.in

# Web-agent is on separate domain
NEXT_PUBLIC_WEB_AGENT_URL=https://pilot.windchasers.in
```

### Web-Agent (.env.local in `/var/www/windchasers-web-agent/`)
```env
# Web-agent runs on pilot.windchasers.in
NEXT_PUBLIC_APP_URL=https://pilot.windchasers.in
```

## PM2 Ecosystem

Both processes are managed via `/var/www/windchasers-proxe/ecosystem.config.js`:

```javascript
{
  name: 'windchasers-dashboard',
  cwd: '/var/www/windchasers-proxe',
  env: { PORT: 3003 }
},
{
  name: 'windchasers-web-agent',
  cwd: '/var/www/windchasers-web-agent',
  env: { PORT: 3001 }
}
```

## Widget Embedding

When the dashboard (at `proxe.windchasers.in`) needs to show the widget preview:
- It loads the widget from `https://pilot.windchasers.in/widget`
- The widget makes API calls to `https://pilot.windchasers.in/api/chat`

## Verification Commands

### Check Dashboard
```bash
# PM2 status
pm2 describe windchasers-dashboard

# Check port
curl http://localhost:3003/api/health

# Check domain
curl https://proxe.windchasers.in/api/health
```

### Check Web-Agent
```bash
# PM2 status
pm2 describe windchasers-web-agent

# Check port
curl http://localhost:3001/widget

# Check domain
curl https://pilot.windchasers.in/widget
```

## Summary

✅ **Dashboard** (`brand/windchasers/dashboard/build/`) → `/var/www/windchasers-proxe/` → `proxe.windchasers.in` (port 3003)

✅ **Web-Agent** (`brand/windchasers/web-agent/build/`) → `/var/www/windchasers-web-agent/` → `pilot.windchasers.in` (port 3001)

✅ **Widget Preview** in dashboard shows: `https://pilot.windchasers.in/widget` ✅ (This is correct!)
