# apps/api/Dockerfile

# ---- Base Stage ----
# Use a specific Node.js version. Alpine Linux is lightweight.
# Choose a version compatible with your dependencies (e.g., LTS like 18 or 20)
FROM node:18-alpine AS base
# Set the working directory inside the container.
WORKDIR /app
# Install pnpm globally within the base image.
# Use --no-cache to reduce layer size if needed, or clean up apt cache later.
RUN npm install -g pnpm


# ---- Dependencies Stage ----
# This stage focuses on installing dependencies efficiently using Docker layer caching.
FROM base AS deps
# Set the working directory.
WORKDIR /app
# Copy only the necessary package manifest files and workspace configuration.
# Copying only these files first means Docker can cache this layer
# as long as these files don't change.
COPY package.json pnpm-lock.yaml ./
# Copy the root workspace file.
COPY ../../pnpm-workspace.yaml ./
# Copy manifests of workspace packages that the API depends on.
COPY ../../packages/types/package.json ./packages/types/
COPY ../../packages/swapper/package.json ./packages/swapper/
# Install *all* dependencies (including devDependencies needed for the build stage).
# --frozen-lockfile ensures pnpm installs exactly the versions specified in pnpm-lock.yaml.
RUN pnpm install --frozen-lockfile


# ---- Builder Stage ----
# This stage builds the TypeScript application.
FROM base AS builder
# Set the working directory.
WORKDIR /app
# Copy the installed node_modules from the 'deps' stage.
COPY --from=deps /app/node_modules ./node_modules
# Copy all source code required for the build.
# Copy the API source code.
COPY . .
# Copy the source code of dependent workspace packages.
COPY ../../packages/types ./packages/types
COPY ../../packages/swapper ./packages/swapper
# Optional: Copy root tsconfig if it's extended by package tsconfigs.
# COPY ../../tsconfig.base.json ./
# Run the build script for the API and its dependencies.
RUN pnpm run --filter "...@gemwallet/api" build


# ---- Pruner Stage ----
# This stage removes development dependencies and unnecessary files.
FROM base AS pruner
# Set the working directory.
WORKDIR /app
# Copy only the necessary production artifacts from the 'builder' stage.
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
# Copy the compiled 'dist' directory of the API.
COPY --from=builder /app/dist ./dist
# Copy the production node_modules (still includes dev deps at this point).
COPY --from=builder /app/node_modules ./node_modules
# Copy the built output of dependent packages (needed if API imports their JS directly).
# Ensure these paths match the output structure.
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/swapper/dist ./packages/swapper/dist
# Run pnpm prune --prod to remove development dependencies from node_modules.
RUN pnpm prune --prod


# ---- Runner Stage ----
# This is the final, minimal image that will run the application.
FROM node:18-alpine AS runner
# Set the working directory.
WORKDIR /app

# Set the Node environment to production for performance optimizations (e.g., in Express).
ENV NODE_ENV=production
# Define the port the application will listen on (can be overridden at runtime).
ENV PORT=3000
# Expose the port the container will listen on.
EXPOSE ${PORT}

COPY --from=pruner /app/node_modules ./node_modules
COPY --from=pruner /app/dist ./dist
COPY --from=pruner /app/package.json ./package.json

COPY --from=pruner /app/packages/types/dist ./node_modules/@gemwallet/types/dist
COPY --from=pruner /app/packages/swapper/dist ./node_modules/@gemwallet/swapper/dist


# Define the command to run the application when the container starts.
CMD ["node", "dist/index.js"]
