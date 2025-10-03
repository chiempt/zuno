# Zalo Service Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package*.json pnpm-lock.yaml ./
COPY zalo-persional/package.json ./zalo-persional/

# Install dependencies
RUN pnpm install

# Copy source code
COPY zalo-persional/ ./zalo-persional/

# Build the application
WORKDIR /app/zalo-persional
RUN pnpm run build

# Expose port
EXPOSE 3001

# Start application
CMD ["pnpm", "run", "start:prod"]
