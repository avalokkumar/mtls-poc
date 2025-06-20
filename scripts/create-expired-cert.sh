#!/bin/bash
# Script to create an expired certificate for demonstration purposes
# This demonstrates how mTLS handles expired certificates

# Set variables
CLIENT_NAME="expired-client"
CLIENT_KEY="certs/${CLIENT_NAME}.key"
CLIENT_CSR="certs/${CLIENT_NAME}.csr"
CLIENT_CERT="certs/${CLIENT_NAME}.crt"
CA_CERT="certs/ca.crt"
CA_KEY="certs/ca.key"
BACKDATE_DAYS=400  # Certificate will be backdated by this many days
VALIDITY_DAYS=30   # Certificate will be valid for this many days from backdate
COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[0;33m'
COLOR_BLUE='\033[0;34m'
COLOR_NC='\033[0m' # No Color

# Print information about what this script does
echo -e "${COLOR_BLUE}=================================================${COLOR_NC}"
echo -e "${COLOR_BLUE}    Creating Expired Certificate for mTLS Demo    ${COLOR_NC}"
echo -e "${COLOR_BLUE}=================================================${COLOR_NC}"
echo -e "\nThis script will:"
echo -e "1. Create a client certificate backdated by ${BACKDATE_DAYS} days"
echo -e "2. Set the certificate validity to ${VALIDITY_DAYS} days from the backdated start"
echo -e "3. Result: A certificate that expired ${BACKDATE_DAYS-VALIDITY_DAYS} days ago"
echo -e "\n${COLOR_YELLOW}This is for educational purposes only to demonstrate certificate expiration handling${COLOR_NC}\n"

# Check if CA files exist
if [ ! -f "$CA_CERT" ] || [ ! -f "$CA_KEY" ]; then
    echo -e "${COLOR_RED}❌ CA files not found! Please run create-ca.sh first.${COLOR_NC}"
    exit 1
fi

# Create certs directory if it doesn't exist
mkdir -p certs

echo "⏳ Creating expired client certificate for '${CLIENT_NAME}'..."

# Generate client private key
echo "🔑 Generating client private key..."
openssl genrsa -out "$CLIENT_KEY" 2048

# Check if key was created successfully
if [ ! -f "$CLIENT_KEY" ]; then
    echo -e "${COLOR_RED}❌ Failed to generate client private key!${COLOR_NC}"
    exit 1
fi

# Generate Certificate Signing Request (CSR)
echo "📝 Generating Certificate Signing Request (CSR)..."
openssl req -new -key "$CLIENT_KEY" -out "$CLIENT_CSR" \
    -subj "/C=IN/ST=KA/L=Bangalore/O=ClientOrg/CN=${CLIENT_NAME}"

# Check if CSR was created successfully
if [ ! -f "$CLIENT_CSR" ]; then
    echo -e "${COLOR_RED}❌ Failed to generate CSR!${COLOR_NC}"
    exit 1
fi

# Calculate dates for expired certificate
START_DATE=$(date -v-${BACKDATE_DAYS}d +%Y%m%d%H%M%SZ)
END_DATE=$(date -v-${BACKDATE_DAYS}d -v+${VALIDITY_DAYS}d +%Y%m%d%H%M%SZ)

echo "📅 Certificate dates:"
echo "   Start date: $(date -v-${BACKDATE_DAYS}d +'%Y-%m-%d')"
echo "   End date:   $(date -v-${BACKDATE_DAYS}d -v+${VALIDITY_DAYS}d +'%Y-%m-%d')"
echo "   (Certificate expired $(($BACKDATE_DAYS-$VALIDITY_DAYS)) days ago)"

# Sign the client certificate with our CA, but with backdated validity period
echo "🔏 Signing client certificate with CA (with backdated validity)..."
openssl x509 -req -in "$CLIENT_CSR" -CA "$CA_CERT" -CAkey "$CA_KEY" \
    -CAcreateserial -out "$CLIENT_CERT" \
    -startdate "$START_DATE" -enddate "$END_DATE" -sha256

# Check if certificate was created successfully
if [ ! -f "$CLIENT_CERT" ]; then
    echo -e "${COLOR_RED}❌ Failed to generate client certificate!${COLOR_NC}"
    exit 1
fi

# Display certificate information
echo -e "${COLOR_GREEN}✅ Expired client certificate for '${CLIENT_NAME}' created successfully!${COLOR_NC}"
echo "📋 Certificate details:"
openssl x509 -in "$CLIENT_CERT" -text -noout | grep -E 'Not Before:|Not After :'

echo -e "\n${COLOR_YELLOW}⚠️ This certificate has already expired and will be rejected by the server.${COLOR_NC}"
echo "The purpose is to demonstrate how certificate expiration is handled in mTLS."
echo "Use ./clients/test-expired.sh to test this expired certificate with the server."
