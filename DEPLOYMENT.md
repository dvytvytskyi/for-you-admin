# Deployment Guide for For You Admin Panel

## Project Overview

This project consists of:
- **Admin Panel Frontend**: Next.js application (Port 3001)
- **Admin API Backend**: Node.js/TypeScript API for admin operations (Port 4001)
- **Public API Backend**: Node.js/TypeScript API for public access (Port 4000)
- **PostgreSQL Database**: Data storage (Port 5435 internal)

All services are containerized using Docker and orchestrated with Docker Compose.

## Prerequisites

### Server Requirements
- Ubuntu/Debian server with root access
- At least 4GB RAM, 2 CPU cores
- 20GB free disk space
- Public IP address

### Software Requirements
- Docker & Docker Compose installed
- Git installed
- SSH access to server

## Environment Setup

### 1. Server Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt install git -y
```

### 2. Clone Repository
```bash
# Clone the project
git clone https://github.com/dvytvytskyi/for-you-admin.git
cd for-you-admin

# Create necessary directories
mkdir -p docker-data/admin-panel-db
mkdir -p admin-panel-backend/uploads
```

### 3. Environment Configuration
```bash
# Copy environment files
cp .env.example .env
cp admin-panel-backend/.env.example admin-panel-backend/.env

# Edit environment variables (see .env.example for required variables)
nano .env
nano admin-panel-backend/.env
```

## Deployment

### Option 1: Automated Deployment Script

Use the provided `full_deploy.sh` script:

```bash
# Make script executable
chmod +x full_deploy.sh

# Run deployment
./full_deploy.sh
```

### Option 2: Manual Deployment

```bash
# Clean up old containers
docker system prune -f
docker compose -f docker-compose.prod.yml down --remove-orphans

# Build and start services
docker compose -f docker-compose.prod.yml up -d --build

# Wait for database to be ready (check logs)
docker logs for-you-admin-panel-postgres-prod

# Run database migrations
docker exec for-you-admin-api-prod npm run migration:run

# Run data mapping scripts
docker exec for-you-admin-api-prod npx ts-node src/scripts/apply-strict-mapping.ts
docker exec for-you-admin-api-prod npx ts-node src/scripts/fix-names-from-report.ts
```

## Access Points

After successful deployment:

- **Admin Panel**: http://your-server-ip:3001
- **Public API**: http://your-server-ip:4000
- **Admin API**: http://your-server-ip:4001 (internal)

## Monitoring and Maintenance

### Check Service Status
```bash
# View running containers
docker ps

# View logs
docker logs for-you-admin-panel-frontend-prod
docker logs for-you-admin-api-prod
docker logs for-you-public-api-prod
```

### Update Deployment
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

### Backup Database
```bash
# Create backup
docker exec for-you-admin-panel-postgres-prod pg_dump -U admin admin_panel > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker exec -i for-you-admin-panel-postgres-prod psql -U admin admin_panel < backup_file.sql
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3001, 4000, 4001, 5435 are not used by other services
2. **Database connection**: Check DATABASE_URL in environment files
3. **Build failures**: Ensure all required environment variables are set
4. **Memory issues**: Increase server RAM or optimize Docker memory limits

### Logs and Debugging
```bash
# View all logs
docker compose -f docker-compose.prod.yml logs

# View specific service logs
docker compose -f docker-compose.prod.yml logs admin-api

# Enter container for debugging
docker exec -it for-you-admin-api-prod bash
```

## Security Considerations

1. **Change default passwords** in environment files
2. **Use HTTPS** with reverse proxy (nginx recommended)
3. **Firewall**: Restrict access to necessary ports only
4. **Regular updates**: Keep Docker images and dependencies updated
5. **Backup strategy**: Regular database backups

## Production Optimizations

1. **SSL/TLS**: Configure HTTPS with Let's Encrypt
2. **Reverse Proxy**: Use nginx or traefik for load balancing
3. **Monitoring**: Set up monitoring with Prometheus/Grafana
4. **Scaling**: Consider horizontal scaling for high traffic
5. **CDN**: Use CDN for static assets

## Support

For issues or questions, check the project documentation or contact the development team.