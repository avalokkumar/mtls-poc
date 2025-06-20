# Web UI for mTLS Certificate Manager

This document provides instructions for using the web-based UI for certificate management and visualization in the mTLS Proof of Concept.

## Overview

The mTLS Certificate Manager web UI provides a user-friendly interface for:

1. Visualizing certificate details and relationships
2. Managing certificates (viewing, generating new ones)
3. Demonstrating the mTLS handshake process
4. Testing API endpoints with different client certificates

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm (included with Node.js)
- OpenSSL (for certificate operations)

### Starting the Web UI

1. First, make sure you're in the project directory:
   ```bash
   cd mtls-poc
   ```

2. Install required Node.js packages:
   ```bash
   cd server
   npm install
   cd ..
   ```

3. Start the web server:
   ```bash
   node server/web-server.js
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:8080
   ```

## Using the Web UI

### Certificate Dashboard

The dashboard provides an overview of your certificates:

- **CA Certificate**: Status and expiry of the Certificate Authority certificate
- **Server Certificate**: Status and expiry of the server certificate
- **Client Certificates**: Count of available client certificates

Actions:
- **Refresh Certificate Status**: Reload certificate information
- **Generate New Certificates**: Create a new set of certificates (CA, server, client1, client2)

### Certificate Details

View detailed information about each certificate:

1. Select a certificate tab (CA, Server, or one of the Client certificates)
2. View information organized by:
   - Basic Info: Serial number, version, algorithms, etc.
   - Subject: Certificate subject fields (CN, O, etc.)
   - Issuer: Certificate issuer fields
   - Validity: Certificate validity period

Each certificate view also includes:
- Certificate chain visualization (showing trust relationships)
- Options to download the certificate in PEM format
- View raw certificate details

### mTLS Handshake Visualization

The handshake visualization demonstrates the mutual TLS authentication process:

1. Choose whether to use a valid or invalid client certificate
2. Click "Start Handshake" to begin the visualization
3. Observe each step in the handshake process
4. See the result (success or failure) of the authentication

This helps understand how mTLS works and how certificate validation affects the connection.

### API Test Console

Test the mTLS server API endpoints with different certificates:

1. Select an API endpoint to test (/, /api/secure-data, /api/status)
2. Choose which client certificate to use:
   - client1: A valid certificate
   - client2: Another valid certificate
   - none: No certificate (should fail)
   - expired: An expired certificate (should fail)
3. Click "Send Request" to make the API call
4. View the response details

## Troubleshooting

### Web UI Cannot Connect to mTLS Server

Make sure the mTLS server is running on port 8443:

```bash
# In a separate terminal
cd mtls-poc
node server/server.js
```

### Certificate Generation Fails

Check that OpenSSL is installed and available in your PATH:

```bash
openssl version
```

The scripts require permission to write to the `certs` directory:

```bash
# Ensure certs directory exists
mkdir -p certs
# Ensure scripts are executable
chmod +x scripts/*.sh
```

### Browser Shows "Cannot Connect to Server"

Ensure the web server is running and listening on port 8080:

```bash
# Check if process is running
ps aux | grep web-server
# or
netstat -tuln | grep 8080
```

## Additional Information

- The web UI is designed for educational purposes to demonstrate mTLS concepts
- All certificate operations are performed using standard OpenSSL commands
- The UI communicates with the mTLS server to test certificate authentication
- For more details on certificate management, see [certificate-management.md](certificate-management.md)
