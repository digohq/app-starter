# Dockerfile for App Starter Web (Next.js)
# 
# Build Instructions:
# 
# Option 1: Using the helper script (recommended)
#   From apps/web directory: ./docker-build.sh preview.env app-starter-web:preview
# 
# Option 2: Manual build with build args
#   From monorepo root:
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
#     --build-arg NEXT_PUBLIC_POSTHOG_KEY=your-key \
#     --build-arg NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com \
#     --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key \
#     -t app-starter-web:latest .
# 
# Option 3: Using .env file with build args (using a script)
#   See docker-build.sh for an automated way to read .env and pass as build args
# 
# For Railway: Set build context to monorepo root and Dockerfile path to apps/web/Dockerfile
# Railway will need to set build args in the build settings
#
# Build stage (Node 22 required by root package.json engines)
FROM node:22-alpine AS builder

# Accept build arguments for environment variables
# These will be embedded in the Next.js build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# Set as environment variables for the build process
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY}
ENV NEXT_PUBLIC_POSTHOG_HOST=${NEXT_PUBLIC_POSTHOG_HOST}
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate

# Set working directory
WORKDIR /app

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy shared package
COPY packages/shared ./packages/shared

# Copy web app files
COPY apps/web ./apps/web

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the shared package first — the web app imports its compiled output.
RUN pnpm --filter "@app-starter/shared" build && pnpm --filter "@app-starter/web" build

# Production stage
FROM node:22-alpine AS production

# Install wget for health checks
RUN apk add --no-cache wget

# Set working directory
WORKDIR /app

# Copy the standalone output from builder
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Set Next.js to production mode
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HUSKY=0

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD sh -c 'wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000} || exit 1'

# Run the standalone server
CMD ["node", "apps/web/server.js"]