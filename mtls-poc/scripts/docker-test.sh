#!/bin/bash
# Script to run tests in the Docker environment for mTLS PoC

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

# Function to check if docker and docker-compose are installed
check_prerequisites() {
  print_header "Checking prerequisites"
  
  # Check Docker
  if ! command -v docker &>/dev/null; then
    echo -e "${COLOR_RED}❌ Docker is not installed or not in PATH${COLOR_NC}"
    echo "Please install Docker to continue"
    exit 1
  fi
  echo -e "${COLOR_GREEN}✓ Docker is installed${COLOR_NC}"
  
  # Check Docker Compose
  if ! command -v docker-compose &>/dev/null; then
    echo -e "${COLOR_RED}❌ Docker Compose is not installed or not in PATH${COLOR_NC}"
    echo "Please install Docker Compose to continue"
    exit 1
  fi
  echo -e "${COLOR_GREEN}✓ Docker Compose is installed${COLOR_NC}"
}

# Function to check service status
check_service() {
  local service_name=$1
  
  echo -n "Checking $service_name status... "
  if [ "$(docker-compose ps -q $service_name 2>/dev/null)" != "" ] && [ "$(docker inspect -f {{.State.Running}} $(docker-compose ps -q $service_name))" == "true" ]; then
    echo -e "${COLOR_GREEN}running${COLOR_NC}"
    return 0
  else
    echo -e "${COLOR_RED}not running${COLOR_NC}"
    return 1
  fi
}

# Function to clean up the environment
cleanup() {
  print_header "Cleaning up Docker environment"
  
  # Remove existing containers
  echo "Stopping and removing containers..."
  docker-compose down 2>/dev/null
  
  # Remove existing certificates
  echo "Removing existing certificates..."
  rm -f certs/*.key certs/*.crt certs/*.csr certs/*.srl 2>/dev/null
  
  echo -e "${COLOR_GREEN}✓ Environment cleanup complete${COLOR_NC}"
}

# Function to start the Docker environment
start_environment() {
  print_header "Starting Docker environment"
  
  echo "Starting services..."
  docker-compose up -d
  
  # Check if services are running
  sleep 5
  
  check_service "mtls-cert-generator" || {
    echo -e "${COLOR_RED}❌ Certificate generator service failed to start${COLOR_NC}"
    echo "Check Docker logs with: docker-compose logs cert-generator"
    exit 1
  }
  
  check_service "mtls-server" || {
    echo -e "${COLOR_RED}❌ mTLS server failed to start${COLOR_NC}"
    echo "Check Docker logs with: docker-compose logs mtls-server"
    exit 1
  }
  
  echo -e "${COLOR_GREEN}✓ Docker environment started successfully${COLOR_NC}"
}

# Function to run tests
run_tests() {
  print_header "Running tests in Docker environment"
  
  echo "Testing with client1 certificate..."
  docker exec -it mtls-client curl --cacert certs/ca.crt --cert certs/client1.crt --key certs/client1.key https://mtls-server:8443/
  if [ $? -eq 0 ]; then
    echo -e "\n${COLOR_GREEN}✓ Test with client1 certificate succeeded${COLOR_NC}"
  else
    echo -e "\n${COLOR_RED}❌ Test with client1 certificate failed${COLOR_NC}"
  fi
  
  echo -e "\nTesting with client2 certificate..."
  docker exec -it mtls-client curl --cacert certs/ca.crt --cert certs/client2.crt --key certs/client2.key https://mtls-server:8443/
  if [ $? -eq 0 ]; then
    echo -e "\n${COLOR_GREEN}✓ Test with client2 certificate succeeded${COLOR_NC}"
  else
    echo -e "\n${COLOR_RED}❌ Test with client2 certificate failed${COLOR_NC}"
  fi
  
  echo -e "\nTesting without certificate (should fail)..."
  docker exec -it mtls-client curl --cacert certs/ca.crt https://mtls-server:8443/ 2>&1 | grep -q "certificate required"
  if [ $? -eq 0 ]; then
    echo -e "${COLOR_GREEN}✓ Test without certificate correctly failed (certificate required)${COLOR_NC}"
  else
    echo -e "${COLOR_RED}❌ Test without certificate did not fail as expected${COLOR_NC}"
  fi
}

# Function to display logs
show_logs() {
  print_header "Server Logs"
  docker-compose logs mtls-server
}

# Function to print summary
print_summary() {
  print_header "Docker Environment Summary"
  
  echo -e "${COLOR_GREEN}✓ mTLS Docker environment setup complete${COLOR_NC}"
  echo -e "${COLOR_CYAN}Available Docker services:${COLOR_NC}"
  echo "  - mtls-cert-generator: Generates CA, server, and client certificates"
  echo "  - mtls-server: Runs the Node.js HTTPS server with mTLS authentication"
  echo "  - mtls-client: Client container for running tests"
  
  echo -e "\n${COLOR_CYAN}Useful Docker commands:${COLOR_NC}"
  echo "  docker-compose logs mtls-server    # View server logs"
  echo "  docker-compose down                # Stop and remove containers"
  echo "  docker-compose up -d               # Start containers in the background"
  
  echo -e "\n${COLOR_CYAN}Access the mTLS server from your host:${COLOR_NC}"
  echo "  curl --cacert certs/ca.crt --cert certs/client1.crt --key certs/client1.key https://localhost:8443/"
}

# Main script execution
main() {
  print_header "mTLS Docker Environment Test Script"
  
  # Execute functions
  check_prerequisites
  cleanup
  start_environment
  run_tests
  print_summary
  
  echo -e "\n${COLOR_YELLOW}Would you like to see the server logs? (y/n)${COLOR_NC}"
  read -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    show_logs
  fi
}

# Run main function
main
