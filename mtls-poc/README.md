# Mutual TLS (mTLS) Authentication Proof of Concept

This project demonstrates how Mutual TLS (mTLS) works by implementing a secure server and client authentication using certificates.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Server Implementation](#server-implementation)
- [Client Implementations](#client-implementations)
- [End-to-End Testing](#end-to-end-testing)
- [Certificate Expiration Demonstration](#certificate-expiration-demonstration)
- [Docker Environment](#docker-environment)
- [Detailed Documentation](#detailed-documentation)
- [Security Note](#security-note)
- [License](#license)

## Overview

Mutual TLS, also known as two-way SSL, is a security protocol where both the client and server authenticate each other using X.509 certificates. This PoC shows:

- How to create a Certificate Authority (CA)
- How to generate and sign server and client certificates
- How to implement a secure HTTPS server with mTLS authentication
- How to connect clients using client certificates
- How client authentication is validated at the server side

## Project Structure

```
mtls-poc/
├── certs/               # Stores all certificates and keys
├── server/              # Server implementation (Node.js)
├── clients/             # Client implementations (curl, Python)
├── scripts/             # Utility scripts for certificate management
└── docs/                # Additional documentation
```

## Prerequisites

- OpenSSL for certificate generation
- Node.js (v14+) for running the server
- curl for command-line client testing
- Python 3.x with requests library for the Python client (optional)

## Quick Start

1. **Generate certificates**:
   ```bash
   # Create CA
   ./scripts/create-ca.sh
   
   # Create server certificate
   ./scripts/create-server-cert.sh
   
   # Create client certificates
   ./scripts/create-client-cert.sh client1
   ./scripts/create-client-cert.sh client2
   ```

2. **Start the server**:
   ```bash
   cd server
   npm install
   node server.js
   ```

3. **Test with curl**:
   ```bash
   # Run the automated test script
   ./clients/curl-test.sh
   
   # Or run individual commands manually
   # Test with valid client certificate
   curl --cacert certs/ca.crt --cert certs/client1.crt --key certs/client1.key https://localhost:8443/

   # Test without client certificate (should fail)
   curl --cacert certs/ca.crt https://localhost:8443
   ```

## Server Implementation

The Node.js HTTPS server is configured to require mutual TLS authentication. Key features include:

- Validates client certificates against the CA
- Rejects unauthorized clients without valid certificates
- Provides detailed certificate information in responses
- Includes multiple API endpoints for testing

### Available Endpoints

- **/** - Root endpoint with certificate details
- **/api/secure-data** - Example protected data API
- **/api/status** - Server status information

All endpoints require a valid client certificate signed by our CA.

## Client Implementations

### Curl Client

A bash script is provided to test the server with curl:

```bash
./clients/curl-test.sh
```

This script tests multiple scenarios including valid certificate authentication and error cases.

### Python Client

A Python client is also available for programmatic testing:

```bash
# Install dependencies
cd clients/python
pip install -r requirements.txt

# Run the client with default settings
python client.py

# Or specify custom parameters
python client.py --url https://localhost:8443 --client-cert ../../certs/client2.crt --client-key ../../certs/client2.key

# Test without client certificate (should fail)
python client.py --no-client-auth

# Test a specific endpoint
python client.py --endpoint /api/secure-data
```

The Python client provides colored output and supports testing all available endpoints.

## End-to-End Testing

An automated script is provided to test the entire workflow from certificate generation to server and client testing:

```bash
./test-all.sh
```

This script performs the following steps:
1. Checks prerequisites (OpenSSL, Node.js)
2. Cleans up any previous test data
3. Generates all certificates (CA, server, and clients)
4. Prepares the Python client dependencies
5. Starts the server in the background
6. Runs curl and Python client tests
7. Cleans up after testing

The script provides detailed output and preserves logs for inspection.

## Certificate Expiration Demonstration

This project includes tools to demonstrate how expired certificates are handled in mTLS:

```bash
# Step 1: Generate an expired certificate (backdated)  
./scripts/create-expired-cert.sh

# Step 2: Test server's handling of expired certificate
./clients/test-expired.sh
```

This demonstration shows:
- How mTLS rejects certificates that have expired
- Comparison between valid and expired certificate behavior
- Certificate validation errors and their meaning

See [Certificate Management](docs/certificate-management.md#certificate-expiration) for more details on certificate expiration.

## Docker Environment

This project includes Docker support for running the mTLS PoC in an isolated environment:

```bash
# Start the Docker environment and run tests
./scripts/docker-test.sh

# Or use Docker Compose directly
docker-compose up -d
```

The Docker setup includes three services:
- **mtls-cert-generator**: Generates all required certificates
- **mtls-server**: Runs the Node.js HTTPS server with mTLS
- **mtls-client**: Provides an environment for testing the server

See [Docker Setup](docs/docker-setup.md) for detailed instructions and troubleshooting.

## Web UI for Certificate Management

A web-based UI is available to visualize and manage certificates, and demonstrate the mTLS handshake process:

```bash
# Install dependencies if needed
cd server
npm install
cd ..

# Start the web UI server
node server/web-server.js

# Open in browser:
# http://localhost:8080
```

The web UI provides:
- Certificate dashboard with status and expiry information
- Detailed certificate visualization and chain of trust
- Interactive mTLS handshake demonstration
- API testing console for different client certificates

See [Web UI Documentation](docs/web-ui.md) for detailed instructions.

## Detailed Documentation

- [Certificate Management](docs/certificate-management.md) - Details on certificate creation and management
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions
- [Docker Setup](docs/docker-setup.md) - Running the PoC in Docker containers
- [Web UI](docs/web-ui.md) - Using the web-based certificate management interface

## Security Note

This is a proof of concept and educational tool. For production systems:

- Use stronger security parameters and keep certificates up-to-date
- Implement proper certificate revocation mechanisms (CRL/OCSP)
- Consider using managed certificate services or dedicated PKI solutions
- Secure private keys appropriately (HSM for high-security environments)
- Follow industry standards and compliance requirements
- Implement proper monitoring and certificate lifecycle management
- Regularly audit and test your mTLS implementation
- Use stronger cipher suites and TLS protocol versions

Refer to [docs/certificate-management.md](docs/certificate-management.md) for more security considerations.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
