# @app-starter/api

NestJS backend API for the App Starter event management platform.

## Tech Stack

- **NestJS 11.0.14** - Progressive Node.js framework
- **Prisma 5.20.0** - Next-generation ORM
- **PostgreSQL** - Database
- **TypeScript** - Type-safe development
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL >= 14.0

### Installation

From the monorepo root:

```bash
pnpm install
```

### Database Setup

1. **Create a PostgreSQL database:**

```bash
createdb app_starter
# Or using psql:
# psql -U postgres
# CREATE DATABASE app_starter;
```

2. **Configure environment variables:**

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

The `.env` file supports the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3001

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Database (required)
# For local development with Docker Compose:
DATABASE_URL=postgresql://app_starter:app_starter@localhost:5432/app_starter?schema=public

# For production, use your actual database credentials:
# DATABASE_URL=postgresql://user:password@host:5432/app_starter?schema=public

# JWT (optional, for authentication)
# JWT_SECRET=your-secret-key
# JWT_ACCESS_TOKEN_EXPIRATION=15m
# JWT_REFRESH_TOKEN_EXPIRATION=7d

# Redis (optional, for OTP storage and rate limiting)
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=
# REDIS_DB=0
# REDIS_TLS=false  # Set to true for TLS-enabled Redis (e.g., Upstash)

# SMTP Configuration (for email delivery)
# For local development with Mailpit:
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=noreply@app-starter.local
SMTP_FROM_NAME=App Starter

# Note: When running the API inside Docker, use SMTP_HOST=mailpit
# When running locally, use SMTP_HOST=localhost
```

**Note:** Environment variables are validated on startup. Missing required variables (like `DATABASE_URL`) will cause the application to fail to start with a clear error message.

3. **Generate Prisma Client:**

```bash
pnpm --filter @app-starter/api prisma:generate
```

4. **Run migrations:**

```bash
pnpm --filter @app-starter/api prisma:migrate
```

This will create the initial migration and apply it to your database.

5. **(Optional) Seed the database:**

```bash
pnpm --filter @app-starter/api prisma:seed
```

### Development

Start the API in development mode with hot reload:

```bash
# From root
pnpm --filter @app-starter/api dev

# Or from this directory
pnpm dev
```

The API will be available at `http://localhost:3001/api`

### Prisma Commands

- **Generate Prisma Client:** `pnpm prisma:generate`
- **Create and apply migration:** `pnpm prisma:migrate`
- **Deploy migrations (production):** `pnpm prisma:migrate:deploy`
- **Open Prisma Studio:** `pnpm prisma:studio`
- **Seed database:** `pnpm prisma:seed`

### Build

Build the application:

```bash
pnpm --filter @app-starter/api build
```

### Production

Start the production server:

```bash
pnpm --filter @app-starter/api start:prod
```

**Important:** Before starting in production, run:

```bash
pnpm --filter @app-starter/api prisma:generate
pnpm --filter @app-starter/api prisma:migrate:deploy
```

## Project Structure

```
api/
├── prisma/
│   ├── schema.prisma      # Prisma schema
│   └── seed.ts            # Database seed script
├── src/
│   ├── prisma/
│   │   ├── prisma.service.ts  # Prisma service
│   │   └── prisma.module.ts   # Prisma module
│   ├── main.ts              # Application entry point
│   ├── app.module.ts        # Root module
│   ├── app.controller.ts    # Root controller
│   └── app.service.ts      # Root service
├── test/                    # E2E tests
└── package.json
```

## Database Models

The Prisma schema includes the following models based on the business context:

- **User** - Platform users
- **Group** - User groups/organizations
- **GroupUser** - User-group relationships
- **Event** - Events
- **Attendee** - Event attendees
- **Session** - Event sessions
- **Speaker** - Event speakers
- **SessionSpeaker** - Session-speaker relationships
- **Sponsor** - Event sponsors

## Using Prisma

### In Services

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
```

### In Controllers

```typescript
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller('users')
export class UserController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll() {
    return this.prisma.user.findMany();
  }
}
```

## Testing

When `NODE_ENV=test` (e.g. `pnpm test` or `pnpm test:e2e`), the API loads **only** `.env.test` and `.env.test.local`—your `.env` and `.env.local` are never used. This keeps your dev database and secrets out of test runs.

Create a dedicated test env so integration and e2e tests never touch your dev DB:

```bash
cp .env.test.example .env.test
# Edit .env.test and set DATABASE_URL to a test database (e.g. app_starter_test)
```

Use a separate test database (e.g. `app_starter_test`). `.env.test` is gitignored.

### Unit Tests

```bash
pnpm test
```

### Watch Mode

```bash
pnpm test:watch
```

### Coverage

```bash
pnpm test:cov
```

### E2E Tests

```bash
pnpm test:e2e
```

## Code Quality

### Linting

```bash
pnpm lint
```

### Type Checking

```bash
pnpm type-check
```
