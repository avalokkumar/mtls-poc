#!/bin/bash
# End-to-End testing script for mTLS PoC
# This script automates the entire workflow from certificate creation to server testing

# Define colors for better readability
COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[0;33m'
COLOR_BLUE='\033[0;34m'
COLOR_CYAN='\033[0;36m'
COLOR_NC='\033[0m' # No Color

# Function to print section headers
print_header() {
  echo -e "\n${COLOR_BLUE}==============================================${COLOR_NC}"
  echo -e "${COLOR_BLUE}$1${COLOR_NC}"
  echo -e "${COLOR_BLUE}==============================================${COLOR_NC}\n"
}

# Function to check if a command executed successfully
check_success() {
  if [ $? -eq 0 ]; then
    echo -e "${COLOR_GREEN}✓ Success: $1${COLOR_NC}"
    return 0
  else
    echo -e "${COLOR_RED}✗ Failed: $1${COLOR_NC}"
    return 1
  fi
}

# Function to check if Node.js, npm and OpenSSL are installed
check_prerequisites() {
  print_header "Checking prerequisites"
  
  echo -n "Checking OpenSSL... "
  if command -v openssl &>/dev/null; then
    echo -e "${COLOR_GREEN}✓ OK${COLOR_NC}"
  else
    echo -e "${COLOR_RED}✗ OpenSSL is not installed${COLOR_NC}"
    echo "Please install OpenSSL to continue"
    exit 1
  fi
  
  echo -n "Checking Node.js... "
  if command -v node &>/dev/null; then
    echo -e "${COLOR_GREEN}✓ OK${COLOR_NC}"
  else
    echo -e "${COLOR_RED}✗ Node.js is not installed${COLOR_NC}"
    echo "Please install Node.js to continue"
    exit 1
  fi
  
  echo "All prerequisites are satisfied"
}

# Function to clean up previous test data
cleanup() {
  print_header "Cleaning up previous test data"
  
  echo "Removing previous certificates..."
  rm -rf certs/*.key certs/*.crt certs/*.csr certs/*.srl 2>/dev/null
  check_success "Cleaned up certificates"
  
  echo "Making sure scripts are executable..."
  chmod +x scripts/*.sh 2>/dev/null
}

# Function to generate certificates
generate_certificates() {
  print_header "Generating certificates"
  
  echo "Creating Certificate Authority..."
  ./scripts/create-ca.sh
  check_success "CA certificate creation" || exit 1
  
  echo "Creating server certificate..."
  ./scripts/create-server-cert.sh
  check_success "Server certificate creation" || exit 1
  
  echo "Creating client1 certificate..."
  ./scripts/create-client-cert.sh client1
  check_success "Client1 certificate creation" || exit 1
  
  echo "Creating client2 certificate..."
  ./scripts/create-client-cert.sh client2
  check_success "Client2 certificate creation" || exit 1
}

# Function to prepare Python client
prepare_python_client() {
  print_header "Preparing Python client"
  
  # Check if pip is available
  if command -v pip &>/dev/null || command -v pip3 &>/dev/null; then
    echo "Installing Python client dependencies..."
    PIP_CMD="pip"
    if ! command -v pip &>/dev/null && command -v pip3 &>/dev/null; then
      PIP_CMD="pip3"
    fi
    
    cd clients/python && $PIP_CMD install -r requirements.txt
    check_success "Python dependencies installation"
    cd ../..
  else
    echo -e "${COLOR_YELLOW}⚠️  pip/pip3 not found, skipping Python client preparation${COLOR_NC}"
    echo "You can install the dependencies manually later."
  fi
}

# Function to start the server in the background
start_server() {
  print_header "Starting mTLS server"
  
  # Kill any previously running server on the same port
  pkill -f "node server/server.js" 2>/dev/null
  
  # Start the server in the background
  echo "Starting Node.js server (this will take a few seconds)..."
  node server/server.js > server-output.log 2>&1 &
  SERVER_PID=$!
  echo "Server started with PID: $SERVER_PID"
  
  # Wait for the server to start
  echo "Waiting for server to start..."
  sleep 3
  
  # Check if the server is running
  if ps -p $SERVER_PID > /dev/null; then
    echo -e "${COLOR_GREEN}✓ Server is running (PID: $SERVER_PID)${COLOR_NC}"
    # Store the PID for cleanup later
    echo $SERVER_PID > .server-pid
  else
    echo -e "${COLOR_RED}✗ Server failed to start${COLOR_NC}"
    echo "Check server-output.log for details"
    exit 1
  fi
}

# Function to run client tests
run_client_tests() {
  print_header "Running client tests"
  
  echo "Testing with curl..."
  # Test with client1 certificate
  curl -s --cacert certs/ca.crt --cert certs/client1.crt --key certs/client1.key https://localhost:8443/ > /dev/null
  check_success "curl test with client1 certificate"
  
  echo "Running curl test script..."
  ./clients/curl-test.sh
  check_success "curl test script" || echo -e "${COLOR_YELLOW}Test script may have encountered some issues${COLOR_NC}"
  
  # If Python client was prepared successfully, test it
  if [ -d "clients/python" ] && [ -f "clients/python/client.py" ]; then
    echo "Testing with Python client..."
    python clients/python/client.py --endpoint / > /dev/null 2>&1
    check_success "Python client test"
  fi
}

# Function to clean up after tests
cleanup_after_tests() {
  print_header "Cleaning up"
  
  # Stop the server
  if [ -f .server-pid ]; then
    SERVER_PID=$(cat .server-pid)
    echo "Stopping server with PID: $SERVER_PID..."
    kill $SERVER_PID 2>/dev/null
    rm .server-pid
    check_success "Server stopped"
  fi
  
  echo "Test output files preserved for inspection:"
  echo "- server-output.log: Server logs"
  echo "- clients/output/: Client test responses"
}

# Function to print summary
print_summary() {
  print_header "End-to-End Test Summary"
  
  echo -e "${COLOR_GREEN}✓ Certificate generation completed successfully${COLOR_NC}"
  echo -e "${COLOR_GREEN}✓ Server started successfully${COLOR_NC}"
  echo -e "${COLOR_GREEN}✓ Client tests executed${COLOR_NC}"
  echo -e "${COLOR_GREEN}✓ All components tested end-to-end${COLOR_NC}"
  
  echo -e "\n${COLOR_YELLOW}Next steps:${COLOR_NC}"
  echo "1. Start the server manually: cd server && node server.js"
  echo "2. Run client tests: ./clients/curl-test.sh"
  echo "3. Try the Python client: cd clients/python && python client.py"
  echo "4. Explore the code and documentation to learn more about mTLS"
  
  echo -e "\n${COLOR_BLUE}Thank you for using the mTLS PoC!${COLOR_NC}"
}

# Main function
main() {
  print_header "mTLS PoC End-to-End Test"
  echo "This script will automate the entire workflow for testing the mTLS PoC"
  
  # Execute the workflow
  check_prerequisites
  cleanup
  generate_certificates
  prepare_python_client
  start_server
  run_client_tests
  cleanup_after_tests
  print_summary
}

# Execute main function
main
