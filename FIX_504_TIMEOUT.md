# Fix 504 Gateway Timeout for Training Plan Generation

**Problem**: Training plan generation times out after 60 seconds with "504 Gateway Timeout" error.

**Cause**: OpenAI API calls can take 60-120 seconds, but Nginx is configured with 60-second timeout.

---

## Solution: Increase Nginx Timeouts

### Step 1: SSH into Server

```bash
ssh root@riderlabs.io
```

### Step 2: Edit Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/riderlabs
```

### Step 3: Update Timeout Values

Find this section:
```nginx
# Backend API - proxy to Node.js
location /api/ {
    proxy_pass http://localhost:5001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # Timeouts for long-running requests
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

**Change to:**
```nginx
# Backend API - proxy to Node.js
location /api/ {
    proxy_pass http://localhost:5001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # Timeouts for long-running requests (AI can take 2+ minutes)
    proxy_connect_timeout 180s;
    proxy_send_timeout 180s;
    proxy_read_timeout 180s;
}
```

### Step 4: Test and Reload Nginx

```bash
# Test configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

---

## Quick Fix Commands

```bash
# SSH into server
ssh root@riderlabs.io

# Edit Nginx config
sudo nano /etc/nginx/sites-available/riderlabs

# Change all three timeout values from 60s to 180s:
# - proxy_connect_timeout 180s;
# - proxy_send_timeout 180s;
# - proxy_read_timeout 180s;

# Save (Ctrl+O, Enter, Ctrl+X)

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

---

## Verification

1. Try generating a training plan
2. Should complete successfully (may take 60-120 seconds)
3. No more 504 errors

---

## Alternative: Optimize AI Prompt

If timeouts persist, consider optimizing the AI prompt to reduce response time:

1. Reduce plan duration (fewer weeks)
2. Simplify AI instructions
3. Use streaming responses (future enhancement)

---

**Status**: Ready to apply
**Time**: 2 minutes
**Risk**: Low (only increases timeout, doesn't break anything)
