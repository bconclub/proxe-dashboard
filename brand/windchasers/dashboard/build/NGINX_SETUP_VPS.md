# Nginx Configuration for Web-Agent Widget on VPS

## Problem
The web-agent runs on `localhost:3001` but the browser can't access it from `proxe.windchasers.in`. We need Nginx to proxy `/widget` requests to the web-agent.

## Solution: Configure Nginx Proxy

### Step 1: Edit Nginx Configuration

SSH into your VPS and edit the Nginx config:

```bash
sudo nano /etc/nginx/sites-available/proxe.windchasers.in
# OR
sudo nano /etc/nginx/sites-enabled/proxe.windchasers.in
```

### Step 2: Add Widget Proxy Location

Add this **inside** your `server` block for `proxe.windchasers.in`:

```nginx
server {
    listen 80;
    server_name proxe.windchasers.in;
    
    # Dashboard (main app on port 3003)
    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Web-Agent Widget - PROXY TO WEB-AGENT ON PORT 3001
    location /widget {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Allow iframe embedding
        add_header X-Frame-Options "SAMEORIGIN" always;
    }
    
    # Web-Agent API routes (for widget functionality)
    # IMPORTANT: These must come BEFORE the general /api/ location if dashboard has its own APIs
    # Proxy specific web-agent API routes to web-agent
    
    # Chat API
    location /api/chat {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'Content-Type, Authorization' always;
        
        if ($request_method = OPTIONS) {
            return 204;
        }
    }
    
    # Calendar APIs
    location /api/calendar {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'Content-Type, Authorization' always;
        
        if ($request_method = OPTIONS) {
            return 204;
        }
    }
}
```

### Step 3: Test and Reload Nginx

```bash
# Test configuration
sudo nginx -t

# If test passes, reload
sudo systemctl reload nginx
```

### Step 4: Verify It Works

```bash
# Test locally on VPS
curl http://localhost:3001/widget
# Should return HTML

# Test through Nginx
curl http://localhost/widget
# Should also return HTML (proxied from web-agent)
```

### Step 5: Update Environment Variable (Optional)

In `/var/www/windchasers-proxe/.env.local`, you can now set:

```env
# Use same domain since Nginx proxies it
NEXT_PUBLIC_WEB_AGENT_URL=https://proxe.windchasers.in
```

Or leave it unset - the code will auto-detect to use the same domain.

### Step 6: Restart Dashboard

```bash
pm2 restart windchasers-dashboard
```

## Verification

After setup:
1. Visit: `https://proxe.windchasers.in/widget` - Should show widget
2. Visit: `https://proxe.windchasers.in/dashboard/settings/web-agent` - Preview should load

## Troubleshooting

### Widget still not loading?

1. **Check web-agent is running:**
   ```bash
   pm2 list | grep windchasers-web-agent
   curl http://localhost:3001/widget
   ```

2. **Check Nginx logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Test Nginx proxy:**
   ```bash
   curl -H "Host: proxe.windchasers.in" http://localhost/widget
   ```

4. **Check browser console** for CORS or network errors

### Common Issues

- **502 Bad Gateway**: Web-agent not running on port 3001
- **404 Not Found**: Nginx location block not matching correctly
- **CORS errors**: Need to add CORS headers in web-agent or Nginx
