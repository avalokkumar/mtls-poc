FROM node:16-alpine

# Create app directory
WORKDIR /usr/src/app

# Install OpenSSL for certificate operations
RUN apk add --no-cache openssl bash

# Copy package files and install dependencies
COPY server/package*.json ./
RUN npm install

# Copy project files
COPY . .

# Create directory for certificates (if it doesn't exist)
RUN mkdir -p certs

# Expose the HTTPS port
EXPOSE 8443

# Set environment variables
ENV NODE_ENV=production

# Set script permissions
RUN chmod +x scripts/*.sh

# Default command - can be overridden in docker-compose.yml
CMD ["node", "server/server.js"]
