#!/bin/bash
# Script to create a client certificate signed by our CA for the mTLS PoC

# Check if client name is provided
if [ "$#" -ne 1 ]; then
    echo "❌ Error: Client name must be specified"
    echo "Usage: $0 <client_name>"
    echo "Example: $0 client1"
    exit 1
fi

# Get client name from parameter
CLIENT_NAME="$1"

# Set variables
CLIENT_KEY="certs/${CLIENT_NAME}.key"
CLIENT_CSR="certs/${CLIENT_NAME}.csr"
CLIENT_CERT="certs/${CLIENT_NAME}.crt"
CA_CERT="certs/ca.crt"
CA_KEY="certs/ca.key"
CLIENT_DAYS=365
COUNTRY="IN"
STATE="KA"
LOCALITY="Bangalore"
ORGANIZATION="ClientOrg"
CN="${CLIENT_NAME}"

# Check if CA files exist
if [ ! -f "$CA_CERT" ] || [ ! -f "$CA_KEY" ]; then
    echo "❌ CA files not found! Please run create-ca.sh first."
    exit 1
fi

echo "⏳ Creating Client Certificate for '${CLIENT_NAME}'..."

# Generate client private key
echo "🔑 Generating client private key..."
openssl genrsa -out "$CLIENT_KEY" 2048

# Check if key was created successfully
if [ ! -f "$CLIENT_KEY" ]; then
    echo "❌ Failed to generate client private key!"
    exit 1
fi

# Generate Certificate Signing Request (CSR)
echo "📝 Generating Certificate Signing Request (CSR)..."
openssl req -new -key "$CLIENT_KEY" -out "$CLIENT_CSR" \
    -subj "/C=$COUNTRY/ST=$STATE/L=$LOCALITY/O=$ORGANIZATION/CN=$CN"

# Check if CSR was created successfully
if [ ! -f "$CLIENT_CSR" ]; then
    echo "❌ Failed to generate CSR!"
    exit 1
fi

# Sign the client certificate with our CA
echo "🔏 Signing client certificate with CA..."
openssl x509 -req -in "$CLIENT_CSR" -CA "$CA_CERT" -CAkey "$CA_KEY" \
    -CAcreateserial -out "$CLIENT_CERT" -days "$CLIENT_DAYS" -sha256

# Check if certificate was created successfully
if [ ! -f "$CLIENT_CERT" ]; then
    echo "❌ Failed to generate client certificate!"
    exit 1
fi

# Display certificate information
echo "✅ Client certificate for '${CLIENT_NAME}' created successfully!"
echo "📋 Certificate details:"
openssl x509 -in "$CLIENT_CERT" -text -noout | grep -E 'Subject:|Issuer:|Not Before:|Not After :|Serial'

echo "🔒 Your client certificate is ready at: $CLIENT_CERT"
echo "⚠️  Keep the client key ($CLIENT_KEY) secure!"

# Verify the certificate against the CA
echo "🔍 Verifying client certificate against CA..."
openssl verify -CAfile "$CA_CERT" "$CLIENT_CERT"
