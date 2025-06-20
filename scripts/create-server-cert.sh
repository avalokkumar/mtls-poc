#!/bin/bash
# Script to create a server certificate signed by our CA for the mTLS PoC

# Set variables
SERVER_KEY="certs/server.key"
SERVER_CSR="certs/server.csr"
SERVER_CERT="certs/server.crt"
CA_CERT="certs/ca.crt"
CA_KEY="certs/ca.key"
SERVER_DAYS=365
COUNTRY="IN"
STATE="KA"
LOCALITY="Bangalore"
ORGANIZATION="ServerOrg"
CN="localhost"

# Check if CA files exist
if [ ! -f "$CA_CERT" ] || [ ! -f "$CA_KEY" ]; then
    echo "❌ CA files not found! Please run create-ca.sh first."
    exit 1
fi

echo "⏳ Creating Server Certificate..."

# Generate server private key
echo "🔑 Generating server private key..."
openssl genrsa -out "$SERVER_KEY" 2048

# Check if key was created successfully
if [ ! -f "$SERVER_KEY" ]; then
    echo "❌ Failed to generate server private key!"
    exit 1
fi

# Generate Certificate Signing Request (CSR)
echo "📝 Generating Certificate Signing Request (CSR)..."
openssl req -new -key "$SERVER_KEY" -out "$SERVER_CSR" \
    -subj "/C=$COUNTRY/ST=$STATE/L=$LOCALITY/O=$ORGANIZATION/CN=$CN"

# Check if CSR was created successfully
if [ ! -f "$SERVER_CSR" ]; then
    echo "❌ Failed to generate CSR!"
    exit 1
fi

# Sign the server certificate with our CA
echo "🔏 Signing server certificate with CA..."
openssl x509 -req -in "$SERVER_CSR" -CA "$CA_CERT" -CAkey "$CA_KEY" \
    -CAcreateserial -out "$SERVER_CERT" -days "$SERVER_DAYS" -sha256

# Check if certificate was created successfully
if [ ! -f "$SERVER_CERT" ]; then
    echo "❌ Failed to generate server certificate!"
    exit 1
fi

# Display certificate information
echo "✅ Server certificate created successfully!"
echo "📋 Certificate details:"
openssl x509 -in "$SERVER_CERT" -text -noout | grep -E 'Subject:|Issuer:|Not Before:|Not After :|Serial'

echo "🔒 Your server certificate is ready at: $SERVER_CERT"
echo "⚠️  Keep the server key ($SERVER_KEY) secure!"

# Verify the certificate against the CA
echo "🔍 Verifying server certificate against CA..."
openssl verify -CAfile "$CA_CERT" "$SERVER_CERT"
