# Certificate Management for mTLS PoC

This document explains the certificate creation and management procedures for the Mutual TLS (mTLS) Proof of Concept.

## Table of Contents

- [Overview](#overview)
- [Certificate Authority (CA)](#certificate-authority-ca)
- [Server Certificate](#server-certificate)
- [Client Certificates](#client-certificates)
- [Certificate Workflow](#certificate-workflow)
- [Certificate Expiration](#certificate-expiration)
- [Security Considerations](#security-considerations)
- [Certificate Verification](#certificate-verification)

## Overview

In mTLS, both the client and server authenticate each other using X.509 certificates. This requires:

1. A Certificate Authority (CA) to issue and sign certificates
2. A server certificate signed by the CA
3. Client certificates signed by the CA

## Certificate Authority (CA)

The Certificate Authority is the trusted entity that signs both server and client certificates. In a production environment, this might be a public CA like Let's Encrypt or an internal enterprise CA. For our PoC, we create a self-signed CA.

### Creating the CA

The CA creation process involves generating a private key and a self-signed certificate:

```bash
# Generate CA private key (4096-bit for strong security)
openssl genrsa -out certs/ca.key 4096

# Create self-signed CA certificate valid for 10 years
openssl req -x509 -new -nodes -key certs/ca.key -sha256 -days 3650 \
    -out certs/ca.crt \
    -subj "/C=IN/ST=KA/L=Bangalore/O=DemoCA/CN=DemoRootCA"
```

The subject fields represent:
- **C** - Country (IN for India)
- **ST** - State (KA for Karnataka)
- **L** - Locality (Bangalore)
- **O** - Organization (DemoCA)
- **CN** - Common Name (DemoRootCA)

### Automation Script

For convenience, a script is provided to automate CA creation:

```bash
./scripts/create-ca.sh
```

This script generates:
- `certs/ca.key` - The CA private key (keep secure)
- `certs/ca.crt` - The CA certificate (used to verify other certificates)

## Server Certificate

The server certificate is used by the HTTPS server to identify itself to clients. Clients verify this certificate against the CA certificate they trust.

### Creating the Server Certificate

The server certificate creation involves three steps:

1. Generate a private key for the server:
```bash
openssl genrsa -out certs/server.key 2048
```

2. Create a Certificate Signing Request (CSR):
```bash
openssl req -new -key certs/server.key -out certs/server.csr \
    -subj "/C=IN/ST=KA/L=Bangalore/O=ServerOrg/CN=localhost"
```

3. Sign the CSR with the CA to create the certificate:
```bash
openssl x509 -req -in certs/server.csr -CA certs/ca.crt -CAkey certs/ca.key \
    -CAcreateserial -out certs/server.crt -days 365 -sha256
```

### Automation Script

For convenience, a script is provided to automate server certificate creation:

```bash
./scripts/create-server-cert.sh
```

This script generates:
- `certs/server.key` - The server's private key
- `certs/server.csr` - The Certificate Signing Request (intermediate file)
- `certs/server.crt` - The signed server certificate

### Server Certificate Components

- **Common Name (CN)**: Set to `localhost` for local development
- **Validity Period**: 365 days (1 year)
- **Key Size**: 2048 bits (secure, but less resource-intensive than CA)

## Client Certificates

Client certificates are used by clients to authenticate themselves to the server. This is the key component that makes TLS "mutual" - both sides authenticate each other.

### Creating Client Certificates

The client certificate creation process is similar to the server certificate:

1. Generate a private key for the client:
```bash
openssl genrsa -out certs/client1.key 2048
```

2. Create a Certificate Signing Request (CSR):
```bash
openssl req -new -key certs/client1.key -out certs/client1.csr \
    -subj "/C=IN/ST=KA/L=Bangalore/O=ClientOrg/CN=client1"
```

3. Sign the CSR with the CA to create the certificate:
```bash
openssl x509 -req -in certs/client1.csr -CA certs/ca.crt -CAkey certs/ca.key \
    -CAcreateserial -out certs/client1.crt -days 365 -sha256
```

### Automation Script

A parameterized script is provided to create client certificates with different names:

```bash
# Create certificates for different clients
./scripts/create-client-cert.sh client1
./scripts/create-client-cert.sh client2
```

For each client, this script generates:
- `certs/<client_name>.key` - The client's private key
- `certs/<client_name>.csr` - The Certificate Signing Request (intermediate file)
- `certs/<client_name>.crt` - The signed client certificate

### Client Certificate Components

- **Common Name (CN)**: Set to the client name (e.g., `client1`, `client2`)
- **Validity Period**: 365 days (1 year)
- **Key Size**: 2048 bits (same as server certificates)

## Certificate Workflow

This section provides a step-by-step workflow for managing certificates in this PoC:

### 1. Complete Certificate Setup

```bash
# First, create the Certificate Authority (CA)
./scripts/create-ca.sh

# Next, create the server certificate
./scripts/create-server-cert.sh

# Finally, create client certificates
./scripts/create-client-cert.sh client1
./scripts/create-client-cert.sh client2
```

### 2. Certificate Renewal Process

When certificates expire (after 365 days for server/client), follow these steps:

```bash
# To renew server certificate
./scripts/create-server-cert.sh

# To renew client certificates
./scripts/create-client-cert.sh client1
./scripts/create-client-cert.sh client2
```

The CA certificate has a longer validity period (3650 days) and shouldn't need frequent renewal.

### 3. Adding New Clients

To add a new client to the system:

```bash
# Create certificate for the new client
./scripts/create-client-cert.sh newclient

# Securely transfer the following files to the client:
# - certs/ca.crt (for server verification)
# - certs/newclient.crt (client's certificate)
# - certs/newclient.key (client's private key)
```

### 4. Certificate Management Best Practices

- Keep the CA key (`ca.key`) secure - it's the trust anchor for the entire system
- Back up all certificates and keys
- Document certificate expiration dates
- Set up monitoring for certificate expiration
- In production, implement proper certificate revocation mechanisms

## Certificate Expiration

Certificate expiration is a critical aspect of certificate management. This PoC includes tools to demonstrate how expired certificates are handled in mTLS authentication.

### Understanding Certificate Expiration

All X.509 certificates have a validity period defined by:
- **Not Before**: The date/time when the certificate becomes valid
- **Not After**: The expiration date/time after which the certificate is no longer valid

In this PoC:
- CA certificate is valid for 3650 days (10 years)
- Server and client certificates are valid for 365 days (1 year)

### Expired Certificate Demonstration

This PoC includes scripts to demonstrate certificate expiration handling:

```bash
# Create an expired certificate
./scripts/create-expired-cert.sh

# Test the server's handling of expired certificates
./clients/test-expired.sh
```

The `create-expired-cert.sh` script creates a client certificate that has already expired by:
1. Backdating the certificate start date (Not Before) by 400 days
2. Setting the validity period to 30 days from that backdated start date
3. Result: A certificate that expired 370 days ago

The `test-expired.sh` script demonstrates:
- How TLS rejects connections with expired certificates
- The difference between valid and expired certificate handling
- Certificate validation error messages

### Certificate Expiration Best Practices

- Monitor certificate expiration dates and renew before they expire
- Implement automated certificate renewal processes
- Set up alerting for upcoming certificate expirations
- Plan for certificate rotation with minimal service disruption
- Consider using shorter validity periods in high-security environments

## Security Considerations

- In a real-world scenario, the CA private key should be stored securely, often offline
- The CA certificate validity period (3650 days/10 years) is longer than server/client certificates
- 4096-bit RSA key is used for the CA, while 2048-bit keys are used for server/client certificates
- SHA-256 is used for signature algorithm, avoiding weaker hash functions
- Client private keys should be distributed securely to their respective owners
- This PoC does not implement certificate revocation lists (CRL) or OCSP
- For production use, consider using a dedicated PKI solution or managed certificates

## Certificate Verification

To view and verify certificate information:

```bash
# View certificate information
openssl x509 -in certs/ca.crt -text -noout

# Verify a certificate against the CA
openssl verify -CAfile certs/ca.crt certs/server.crt
openssl verify -CAfile certs/ca.crt certs/client1.crt
```
