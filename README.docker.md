# Docker/Podman Setup for Task Manager Application

This document provides instructions for containerizing and running the Task Manager application using Docker or Podman.

## Prerequisites

- Podman or Docker installed on your system
- Podman-compose or Docker-compose installed on your system

## Container Structure

The application is containerized with three services:

1. **MySQL Database**: Stores application data
2. **Backend API**: Node.js Express server
3. **Frontend**: Angular application served via Nginx

## Building and Running with Podman

### Using podman-compose (Recommended)

```bash
# Navigate to the project directory
cd fullstack-app

# Build and start all containers
podman-compose up -d --build

# View logs
podman-compose logs -f
```

### Using Podman commands directly

If you prefer to use Podman commands directly:

```bash
# Create a pod for the application
podman pod create --name task-manager-pod -p 80:80 -p 3000:3000 -p 3306:3306

# Run MySQL
podman run -d --pod task-manager-pod \
  --name task-manager-db \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=taskmanager \
  -e MYSQL_USER=user \
  -e MYSQL_PASSWORD=password \
  -v mysql-data:/var/lib/mysql \
  mysql:8.0

# Build and run backend
podman build -t task-manager-backend ./backend
podman run -d --pod task-manager-pod \
  --name task-manager-backend \
  -e DB_HOST=localhost \
  -e DB_USER=user \
  -e DB_PASSWORD=password \
  -e DB_NAME=taskmanager \
  -e PORT=3000 \
  task-manager-backend

# Build and run frontend
podman build -t task-manager-frontend .
podman run -d --pod task-manager-pod \
  --name task-manager-frontend \
  task-manager-frontend
```

## Accessing the Application

Once the containers are running:

- Frontend: http://localhost
- Backend API: http://localhost:3000
- Database: localhost:3306 (accessible from within containers or via port 3306 on the host)

## Stopping the Application

```bash
# If using podman-compose
podman-compose down

# If using direct podman commands
podman pod stop task-manager-pod
podman pod rm task-manager-pod
```

## Troubleshooting

### Database Connection Issues

The backend includes retry logic for database connections, but if you're experiencing issues:

1. Check if the MySQL container is running: `podman ps`
2. View backend logs: `podman logs task-manager-backend`
3. Ensure environment variables are correctly set

### Frontend Not Loading

If the frontend isn't loading correctly:

1. Check nginx logs: `podman logs task-manager-frontend`
2. Verify that the build process completed successfully
3. Ensure the nginx configuration is correctly handling Angular routes

## Data Persistence

The MySQL data is stored in a named volume `mysql-data`. This ensures your data persists even when containers are removed.

To remove all data and start fresh:

```bash
podman volume rm mysql-data
```
