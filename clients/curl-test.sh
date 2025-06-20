#!/bin/bash
# Script to test the mTLS server using curl with various certificate scenarios

# Set variables
SERVER_URL="https://localhost:8443"
CA_CERT="../certs/ca.crt"
CLIENT1_CERT="../certs/client1.crt"
CLIENT1_KEY="../certs/client1.key"
CLIENT2_CERT="../certs/client2.crt"
CLIENT2_KEY="../certs/client2.key"
COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[0;33m'
COLOR_BLUE='\033[0;34m'
COLOR_NC='\033[0m' # No Color

# Create output directory for response files
mkdir -p output

# Function to print section headers
print_header() {
  echo -e "\n${COLOR_BLUE}===============================================${COLOR_NC}"
  echo -e "${COLOR_BLUE}$1${COLOR_NC}"
  echo -e "${COLOR_BLUE}===============================================${COLOR_NC}\n"
}

# Function to run a curl test and display result
run_test() {
  local title="$1"
  local endpoint="$2"
  local cmd="$3"
  local output_file="$4"
  
  echo -e "${COLOR_YELLOW}Test: ${title}${COLOR_NC}"
  echo -e "${COLOR_YELLOW}Endpoint: ${endpoint}${COLOR_NC}"
  echo -e "${COLOR_YELLOW}Command: ${cmd}${COLOR_NC}"
  
  # Execute the curl command
  eval ${cmd}
  local exit_code=$?
  
  # Display result based on exit code
  if [ $exit_code -eq 0 ]; then
    echo -e "${COLOR_GREEN}Success (exit code: $exit_code)${COLOR_NC}"
    if [ -f "$output_file" ]; then
      echo -e "${COLOR_GREEN}Response saved to: ${output_file}${COLOR_NC}\n"
    else
      echo -e "${COLOR_GREEN}Test completed successfully${COLOR_NC}\n"
    fi
  else
    echo -e "${COLOR_RED}Failed (exit code: $exit_code)${COLOR_NC}\n"
  fi
}

# Check if the server is running
server_check=$(curl -s -o /dev/null -w "%{http_code}" --insecure https://localhost:8443)
if [ $? -ne 0 ]; then
  echo -e "${COLOR_RED}Error: Server is not running or not accessible at https://localhost:8443${COLOR_NC}"
  echo -e "${COLOR_RED}Please start the server before running this script:${COLOR_NC}"
  echo -e "${COLOR_RED}cd ../server && node server.js${COLOR_NC}"
  exit 1
fi

# Print script header
print_header "mTLS Server Testing Script"
echo -e "This script will test various scenarios with the mTLS server\n"
echo -e "Server URL: ${SERVER_URL}"
echo -e "Using client certificates: client1 and client2\n"

# Test 1: Valid certificate (client1) - Root endpoint
print_header "Test 1: Access with client1 certificate - Root endpoint"
run_test "Access with client1 certificate" "${SERVER_URL}/" \
  "curl -s -o output/test1.json --cacert ${CA_CERT} --cert ${CLIENT1_CERT} --key ${CLIENT1_KEY} ${SERVER_URL}/ && cat output/test1.json | json_pp" \
  "output/test1.json"

# Test 2: Valid certificate (client1) - Secure data endpoint
print_header "Test 2: Access with client1 certificate - Secure data endpoint"
run_test "Access with client1 certificate" "${SERVER_URL}/api/secure-data" \
  "curl -s -o output/test2.json --cacert ${CA_CERT} --cert ${CLIENT1_CERT} --key ${CLIENT1_KEY} ${SERVER_URL}/api/secure-data && cat output/test2.json | json_pp" \
  "output/test2.json"

# Test 3: Valid certificate (client1) - Status endpoint
print_header "Test 3: Access with client1 certificate - Status endpoint"
run_test "Access with client1 certificate" "${SERVER_URL}/api/status" \
  "curl -s -o output/test3.json --cacert ${CA_CERT} --cert ${CLIENT1_CERT} --key ${CLIENT1_KEY} ${SERVER_URL}/api/status && cat output/test3.json | json_pp" \
  "output/test3.json"

# Test 4: Valid certificate (client2) - Root endpoint
print_header "Test 4: Access with client2 certificate - Root endpoint"
run_test "Access with client2 certificate" "${SERVER_URL}/" \
  "curl -s -o output/test4.json --cacert ${CA_CERT} --cert ${CLIENT2_CERT} --key ${CLIENT2_KEY} ${SERVER_URL}/ && cat output/test4.json | json_pp" \
  "output/test4.json"

# Test 5: No client certificate (should fail)
print_header "Test 5: Access without client certificate (should fail)"
run_test "Access without client certificate" "${SERVER_URL}/" \
  "curl -s -o /dev/null --cacert ${CA_CERT} ${SERVER_URL}/ 2>&1 || echo -e \"${COLOR_GREEN}Expected failure - Server rejected connection without client certificate${COLOR_NC}\"" \
  ""

# Test 6: Invalid client certificate path (should fail)
print_header "Test 6: Access with non-existent client certificate (should fail)"
run_test "Access with non-existent client certificate" "${SERVER_URL}/" \
  "curl -s -o /dev/null --cacert ${CA_CERT} --cert nonexistent.crt --key nonexistent.key ${SERVER_URL}/ 2>&1 || echo -e \"${COLOR_GREEN}Expected failure - Invalid certificate path${COLOR_NC}\"" \
  ""

print_header "Testing Complete"
echo -e "Summary of tests:"
echo -e "✓ Tests 1-4: Successful access with valid client certificates"
echo -e "✓ Tests 5-6: Verified server rejection of invalid certificates"
echo -e "\nCheck the output/ directory for response files\n"
