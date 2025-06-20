#!/bin/bash
# Script to create a Certificate Authority (CA) for the mTLS PoC

# Set variables
CA_KEY="certs/ca.key"
CA_CERT="certs/ca.crt"
CA_DAYS=3650
COUNTRY="IN"
STATE="KA"
LOCALITY="Bangalore"
ORGANIZATION="DemoCA"
CN="DemoRootCA"

# Create certs directory if it doesn't exist
mkdir -p certs

echo "⏳ Creating Certificate Authority (CA)..."

# Generate CA private key
echo "🔑 Generating CA private key..."
openssl genrsa -out "$CA_KEY" 4096

# Check if key was created successfully
if [ ! -f "$CA_KEY" ]; then
    echo "❌ Failed to generate CA private key!"
    exit 1
fi

# Generate CA certificate
echo "📜 Generating CA certificate..."
openssl req -x509 -new -nodes -key "$CA_KEY" -sha256 -days "$CA_DAYS" \
    -out "$CA_CERT" \
    -subj "/C=$COUNTRY/ST=$STATE/L=$LOCALITY/O=$ORGANIZATION/CN=$CN"

# Check if certificate was created successfully
if [ ! -f "$CA_CERT" ]; then
    echo "❌ Failed to generate CA certificate!"
    exit 1
fi

# Display certificate information
echo "✅ Certificate Authority created successfully!"
echo "📋 Certificate details:"
openssl x509 -in "$CA_CERT" -text -noout | grep -E 'Subject:|Issuer:|Not Before:|Not After :|Serial'

echo "🔒 Your CA certificate is ready at: $CA_CERT"
echo "⚠️  Keep the CA key ($CA_KEY) secure - it's used for signing certificates!"
