FROM postgres:18-alpine

# Set environment variables
ENV POSTGRES_DB=app_starter
ENV POSTGRES_USER=app_starter
ENV POSTGRES_PASSWORD=app_starter

# Create initialization script directory
RUN mkdir -p /docker-entrypoint-initdb.d

# Copy initialization scripts if needed
# COPY init.sql /docker-entrypoint-initdb.d/

# Expose PostgreSQL port
EXPOSE 5432

# Use default postgres entrypoint
# The postgres image will automatically execute scripts in /docker-entrypoint-initdb.d

