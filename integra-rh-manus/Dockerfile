# Stage 1: Build the application
FROM node:20 AS builder
WORKDIR /usr/src/app

# Copy package manager files and patches
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install all dependencies (including devDependencies needed for build)
RUN npm install -g pnpm && pnpm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN pnpm run build

# Stage 2: Create the production image
FROM node:20-slim
WORKDIR /usr/src/app

# Set environment to production
ENV NODE_ENV=production

# Copy package manager files and patches
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install only production dependencies
RUN npm install -g pnpm && pnpm install

# Copy the built application from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# The server listens on the port specified by the PORT env var, which is provided by Cloud Run.
# We expose 8080 as a common default.
EXPOSE 8080

# Start the server
CMD ["node", "dist/index.js"]