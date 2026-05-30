# Use an official Node.js runtime as the base image
FROM node:20-alpine

# Build argument for environment-specific installs
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --production

# Copy application source
COPY . .

# Expose the default app port. The actual runtime port is controlled by environment variables.
EXPOSE 9093

# Run the application from the current source location
CMD ["node", "src/server.js"]
