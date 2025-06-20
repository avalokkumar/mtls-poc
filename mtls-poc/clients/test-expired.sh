#!/bin/bash
# Script to test the server's handling of expired certificates
# This demonstrates how mTLS rejects expired certificates

# Set variables
SERVER_URL="https://localhost:8443"
CA_CERT="../certs/ca.crt"
EXPIRED_CERT="../certs/expired-client.crt"
EXPIRED_KEY="../certs/expired-client.key"
VALID_CERT="../certs/client1.crt"
VALID_KEY="../certs/client1.key"
COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[0;33m'
COLOR_BLUE='\033[0;34m'
COLOR_CYAN='\033[0;36m'
COLOR_NC='\033[0m' # No Color

# Function to print section headers
print_header() {
  echo -e "\n${COLOR_BLUE}===============================================${COLOR_NC}"
  echo -e "${COLOR_BLUE}$1${COLOR_NC}"
  echo -e "${COLOR_BLUE}===============================================${COLOR_NC}\n"
}

# Create output directory for response files
mkdir -p expired-test

# Check if the expired certificate exists
if [ ! -f "$EXPIRED_CERT" ] || [ ! -f "$EXPIRED_KEY" ]; then
  echo -e "${COLOR_RED}Error: Expired certificate files not found!${COLOR_NC}"
  echo "Please run ./scripts/create-expired-cert.sh first"
  exit 1
fi

# Check if the server is running
check_server() {
  echo "Checking if server is running..."
  if curl -s -o /dev/null --cacert "$CA_CERT" "$SERVER_URL" 2>/dev/null; then
    echo -e "${COLOR_GREEN}Server is running at $SERVER_URL${COLOR_NC}\n"
    return 0
  else
    echo -e "${COLOR_RED}Server is not running or not accessible at $SERVER_URL${COLOR_NC}"
    echo -e "Please start the server with: cd ../server && node server.js\n"
    return 1
  fi
}

# Function to verify certificate details
verify_certificate() {
  local cert_file=$1
  local label=$2

  echo -e "${COLOR_CYAN}Verifying $label certificate:${COLOR_NC}"
  openssl x509 -in "$cert_file" -text -noout | grep -E 'Not Before:|Not After :' | sed 's/^/  /'
  echo ""

  # Check certificate validity
  current_time=$(date +%s)
  not_before=$(openssl x509 -in "$cert_file" -noout -startdate | cut -d= -f2)
  not_after=$(openssl x509 -in "$cert_file" -noout -enddate | cut -d= -f2)
  
  start_epoch=$(date -j -f "%b %d %T %Y %Z" "$not_before" +%s 2>/dev/null)
  end_epoch=$(date -j -f "%b %d %T %Y %Z" "$not_after" +%s 2>/dev/null)
  
  if [ $current_time -lt $start_epoch ]; then
    echo -e "  ${COLOR_YELLOW}Certificate is not yet valid${COLOR_NC}"
  elif [ $current_time -gt $end_epoch ]; then
    echo -e "  ${COLOR_RED}Certificate has expired${COLOR_NC}"
  else
    echo -e "  ${COLOR_GREEN}Certificate is currently valid${COLOR_NC}"
  fi
  echo ""
}

# Function to test with a specific certificate
test_with_certificate() {
  local cert_file=$1
  local key_file=$2
  local output_file=$3
  local label=$4
  
  echo -e "${COLOR_CYAN}Testing with $label:${COLOR_NC}"
  echo "curl --cacert $CA_CERT --cert $cert_file --key $key_file $SERVER_URL/"
  
  # Run curl command and capture output/error
  output=$(curl -s -o "$output_file" --cacert "$CA_CERT" --cert "$cert_file" --key "$key_file" "$SERVER_URL/" 2>&1)
  exit_code=$?
  
  # Check the result
  if [ $exit_code -eq 0 ]; then
    echo -e "${COLOR_GREEN}✓ Connection succeeded (exit code: $exit_code)${COLOR_NC}"
    echo "Response saved to $output_file"
    echo -e "${COLOR_CYAN}Response content:${COLOR_NC}"
    cat "$output_file" | json_pp || cat "$output_file"
  else
    echo -e "${COLOR_RED}✗ Connection failed (exit code: $exit_code)${COLOR_NC}"
    echo -e "${COLOR_RED}$output${COLOR_NC}"
    
    # Explain the error
    if [[ "$output" == *"certificate has expired"* ]]; then
      echo -e "${COLOR_YELLOW}This is the expected behavior: The server rejected the expired certificate${COLOR_NC}"
    elif [[ "$output" == *"certificate verify failed"* ]]; then
      echo -e "${COLOR_YELLOW}Certificate verification failed. This could be due to expiration or other validation issues.${COLOR_NC}"
    fi
  fi
  echo ""
}

# Main script
print_header "Certificate Expiration Test for mTLS"

# Check if server is running
check_server || exit 1

# Verify certificates
verify_certificate "$EXPIRED_CERT" "expired"
verify_certificate "$VALID_CERT" "valid"

# Test with expired certificate (should fail)
print_header "Test with Expired Certificate (should fail)"
test_with_certificate "$EXPIRED_CERT" "$EXPIRED_KEY" "expired-test/expired-cert-response.json" "expired certificate"

# Test with valid certificate (should succeed)
print_header "Test with Valid Certificate (should succeed)"
test_with_certificate "$VALID_CERT" "$VALID_KEY" "expired-test/valid-cert-response.json" "valid certificate"

print_header "Certificate Expiration Testing Complete"
echo "Summary:"
echo "- Expired certificate: Connection should be rejected with certificate expiration error"
echo "- Valid certificate: Connection should succeed"
echo -e "\nThis demonstrates how mTLS validates certificate expiration dates and rejects expired certificates."
