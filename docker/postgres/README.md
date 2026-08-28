# PostgreSQL Docker Setup

This directory contains the Docker configuration for running PostgreSQL for the App Starter application.

## Quick Start

### Using Docker Compose (Recommended)

From the monorepo root:

```bash
# Start the database
docker-compose up -d

# Stop the database
docker-compose down

# View logs
docker-compose logs -f postgres
```

### Using Docker directly

```bash
# Build the image
docker build -t app-starter-postgres:latest -f docker/postgres/Dockerfile .

# Run the container
docker run -d \
  --name app-starter-postgres \
  -e POSTGRES_DB=app_starter \
  -e POSTGRES_USER=app_starter \
  -e POSTGRES_PASSWORD=app_starter \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  app-starter-postgres:latest
```

## Connection Details

When running with docker-compose:

- **Host:** `localhost` (or `postgres` from within docker network)
- **Port:** `5432`
- **Database:** `app_starter`
- **Username:** `app_starter`
- **Password:** `app_starter`

## Environment Variables

You can override the default values by setting environment variables:

- `POSTGRES_DB` - Database name (default: `app_starter`)
- `POSTGRES_USER` - Database user (default: `app_starter`)
- `POSTGRES_PASSWORD` - Database password (default: `app_starter`)

## Data Persistence

Data is persisted in a Docker volume named `postgres_data`. To remove all data:

```bash
docker-compose down -v
```

## Connecting to the Database

### Using psql

```bash
# From host machine
psql -h localhost -U app_starter -d app_starter

# From within docker network
docker-compose exec postgres psql -U app_starter -d app_starter
```

### Using Prisma Studio

```bash
# Make sure DATABASE_URL is set correctly
cd apps/api
pnpm prisma:studio
```

## Health Check

The container includes a health check that verifies PostgreSQL is ready to accept connections.

Check health status:

```bash
docker-compose ps
```

## Troubleshooting

### Port already in use

If port 5432 is already in use, change it in `docker-compose.yml`:

```yaml
ports:
  - '5433:5432' # Use 5433 on host instead
```

Then update your `DATABASE_URL`:

```
DATABASE_URL=postgresql://app_starter:app_starter@localhost:5433/app_starter?schema=public
```

### Reset database

To completely reset the database:

```bash
docker-compose down -v
docker-compose up -d
```

Then run migrations again:

```bash
pnpm --filter @app-starter/api prisma:migrate
```
