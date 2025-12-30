# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.19

FROM node:${NODE_VERSION}-alpine

# Set development environment by default
ENV NODE_ENV development

WORKDIR /usr/src/app

# Install dependencies for development
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership of the working directory
RUN chown -R nestjs:nodejs /usr/src/app
USER nestjs

# Copy the rest of the source files into the image
COPY --chown=nestjs:nodejs . .

# Expose the port that the application listens on
EXPOSE 3000

# Run the application in development mode
CMD ["npm", "run", "start:dev"]
