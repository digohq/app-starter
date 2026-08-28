# @app-starter/web

Next.js frontend application for the App Starter event management platform.

## Tech Stack

- **Next.js 14.2.18** - React framework with App Router
- **React 18.3.1** - UI library
- **TypeScript 5.5.4** - Type-safe development
- **Tailwind CSS 3.4.7** - Utility-first CSS framework
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

From the monorepo root:

```bash
pnpm install
```

### Development

Start the development server:

```bash
# From root
pnpm --filter @app-starter/web dev

# Or from this directory
pnpm dev
```

The application will be available at `http://localhost:${PORT}` (default: `http://localhost:3000`)

The port can be configured in your `.env.local` file by setting `PORT=3000` (or any other port). The dev script automatically loads environment variables from `.env.local` and `.env` files.

### Environment Variables

Next.js has built-in support for `.env` files - no additional packages needed!

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Next.js automatically loads environment variables in this order:

1. `.env.local` (loaded in all environments, ignored by git)
2. `.env.development`, `.env.production`, `.env.test` (based on NODE_ENV)
3. `.env` (default, loaded in all environments)

**Important:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Other variables are only available on the server.

Example `.env.local`:

```env
PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NODE_ENV=development
```

**Note:** The `PORT` variable controls which port the Next.js dev server runs on. If not set, it defaults to 3000.

### Build

Build the application for production:

```bash
pnpm --filter @app-starter/web build
```

### Production

Start the production server:

```bash
pnpm --filter @app-starter/web start
```

## Project Structure

```
web/
├── src/
│   └── app/                 # Next.js App Router
│       ├── layout.tsx       # Root layout
│       ├── page.tsx         # Home page
│       ├── globals.css      # Global styles
│       ├── loading.tsx      # Loading UI
│       ├── error.tsx        # Error boundary
│       └── not-found.tsx    # 404 page
├── features/                # Feature PRDs and documentation
└── package.json
```

## Using Shared Types

Import shared types from `@app-starter/shared`:

```typescript
import { ApiResponse, ApiError } from '@app-starter/shared';
```

## API Integration

The app is configured to connect to the API at `NEXT_PUBLIC_API_URL` (default: `http://localhost:3001/api`).

Example API call:

```typescript
// Client component (browser)
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const response = await fetch(`${apiUrl}/health`);
const data = await response.json();

// Server component or API route
// You can also use server-only variables (without NEXT_PUBLIC_ prefix)
const serverOnlyVar = process.env.SECRET_KEY; // Only available on server
```

## Styling

This project uses Tailwind CSS for styling. Global styles are in `src/app/globals.css`.

### Adding New Styles

1. Use Tailwind utility classes directly in components
2. Add custom styles to `globals.css` if needed
3. Extend Tailwind theme in `tailwind.config.ts`

## Next Steps

1. Set up API client utilities
2. Create feature modules (events, users, etc.)
3. Set up authentication
4. Add routing and navigation
5. Set up state management (if needed)
6. Add error handling and loading states
7. Configure analytics (if needed)
