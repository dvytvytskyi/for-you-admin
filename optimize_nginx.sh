#!/bin/bash

# Configuration
HOST="135.181.201.185"
USER="root"
PASS="xTVvPEwrpaF4"

echo "🛠 Updating Nginx configs on $HOST..."

sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no $USER@$HOST << 'EOF'
  
  # Update foryou-realestate.com
  cat > /etc/nginx/sites-available/foryou-realestate.com << 'NGINX_EOF'
# HTTP - редирект на HTTPS
server {
    listen 80;
    server_name foryou-realestate.com www.foryou-realestate.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS - проксування на frontend (основний сайт на порту 3000)
server {
    listen 443 ssl http2;
    server_name foryou-realestate.com www.foryou-realestate.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/foryou-realestate.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/foryou-realestate.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Gzip Compression Optimized
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/x-javascript
        application/xml
        application/xml+rss
        application/json
        image/svg+xml
        font/opentype
        font/otf
        font/ttf
        image/x-icon;

    # Client Max Body Size
    client_max_body_size 50M;

    # Proxy до Frontend (основний сайт на порту 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Proxy до Backend API
    location /api {
        proxy_pass http://127.0.0.1:4000/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
NGINX_EOF

  # Update admin.foryou-realestate.com
  cat > /etc/nginx/sites-available/admin.foryou-realestate.com << 'NGINX_EOF'
server {
    server_name admin.foryou-realestate.com;

    # Gzip Compression Optimized
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/x-javascript
        application/xml
        application/xml+rss
        application/json
        image/svg+xml
        font/opentype
        font/otf
        font/ttf
        image/x-icon;

    # Client Max Body Size
    client_max_body_size 50M;

    # Proxy до Backend API
    location /api {
        proxy_pass http://127.0.0.1:4000/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Proxy до Next.js Frontend (Admin Panel)
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    listen 443 ssl http2; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/admin.foryou-realestate.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/admin.foryou-realestate.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}
server {
    if ($host = admin.foryou-realestate.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    server_name admin.foryou-realestate.com;
    return 404; # managed by Certbot
}
NGINX_EOF

  echo "🧪 Testing Nginx configuration..."
  nginx -t && systemctl reload nginx
  echo "✅ Nginx updated and reloaded."

EOF

echo "🎉 All done!"
