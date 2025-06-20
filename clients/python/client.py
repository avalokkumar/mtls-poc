#!/usr/bin/env python3
"""
Python Client for Mutual TLS (mTLS) Authentication Demo

This client connects to a server using mutual TLS authentication,
providing the client certificate for authentication.
"""

import os
import json
import argparse
import sys
from pathlib import Path
from typing import Dict, Any, Optional, Union

try:
    import requests
    from prettytable import PrettyTable
    from colorama import Fore, Style, init
except ImportError:
    print("Required packages not installed. Please run:")
    print("pip install -r requirements.txt")
    sys.exit(1)

# Initialize colorama for cross-platform colored terminal output
init()

# Default settings
DEFAULT_SERVER_URL = "https://localhost:8443"
DEFAULT_CA_CERT = "../../certs/ca.crt"
DEFAULT_CLIENT_CERT = "../../certs/client1.crt"
DEFAULT_CLIENT_KEY = "../../certs/client1.key"
DEFAULT_ENDPOINT = "/"
AVAILABLE_ENDPOINTS = ["/", "/api/secure-data", "/api/status"]


class MTLSClient:
    """Client for connecting to servers with Mutual TLS authentication."""

    def __init__(
        self,
        server_url: str,
        ca_cert_path: str,
        client_cert_path: Optional[str] = None,
        client_key_path: Optional[str] = None,
    ):
        """
        Initialize the mTLS client.

        Args:
            server_url: Base URL for the server
            ca_cert_path: Path to the CA certificate
            client_cert_path: Path to the client certificate (optional for non-mTLS)
            client_key_path: Path to the client key (optional for non-mTLS)
        """
        self.server_url = server_url.rstrip("/")
        self.ca_cert_path = Path(ca_cert_path)
        self.client_cert = None

        # Check if CA certificate exists
        if not self.ca_cert_path.exists():
            print(f"{Fore.RED}Error: CA certificate not found at {ca_cert_path}{Style.RESET_ALL}")
            sys.exit(1)

        # Configure client certificate if provided
        if client_cert_path and client_key_path:
            client_cert_path = Path(client_cert_path)
            client_key_path = Path(client_key_path)

            # Check if client certificate and key exist
            if not client_cert_path.exists():
                print(f"{Fore.RED}Error: Client certificate not found at {client_cert_path}{Style.RESET_ALL}")
                sys.exit(1)
            if not client_key_path.exists():
                print(f"{Fore.RED}Error: Client key not found at {client_key_path}{Style.RESET_ALL}")
                sys.exit(1)

            self.client_cert = (str(client_cert_path), str(client_key_path))

        print(f"{Fore.BLUE}Initializing mTLS client:{Style.RESET_ALL}")
        print(f"Server URL: {self.server_url}")
        print(f"CA Certificate: {self.ca_cert_path}")
        if self.client_cert:
            print(f"Client Certificate: {client_cert_path}")
            print(f"Client Key: {client_key_path}")
        else:
            print(f"{Fore.YELLOW}Warning: No client certificate provided. Server authentication only.{Style.RESET_ALL}")
        print("")

    def request(self, endpoint: str, method: str = "GET", data: Optional[Dict[str, Any]] = None) -> requests.Response:
        """
        Make an HTTP request to the server.

        Args:
            endpoint: API endpoint to request (e.g., /, /api/status)
            method: HTTP method (default: GET)
            data: Optional data to send with the request

        Returns:
            Response object
        """
        url = f"{self.server_url}{endpoint}"
        print(f"{Fore.CYAN}Requesting {method} {url}{Style.RESET_ALL}")

        try:
            response = requests.request(
                method,
                url,
                verify=str(self.ca_cert_path),  # CA certificate for server verification
                cert=self.client_cert,          # Client certificate for client authentication
                json=data,
                timeout=10
            )
            return response
        except requests.exceptions.SSLError as e:
            print(f"{Fore.RED}SSL Error: {e}{Style.RESET_ALL}")
            print("This might be due to certificate issues or mTLS configuration problems.")
            sys.exit(1)
        except requests.exceptions.ConnectionError as e:
            print(f"{Fore.RED}Connection Error: {e}{Style.RESET_ALL}")
            print("Is the server running? Check server address and port.")
            sys.exit(1)
        except Exception as e:
            print(f"{Fore.RED}Error: {e}{Style.RESET_ALL}")
            sys.exit(1)

    def test_all_endpoints(self) -> None:
        """Test all available endpoints and display the results."""
        results_table = PrettyTable()
        results_table.field_names = ["Endpoint", "Status", "Result"]
        results_table.align = "l"

        for endpoint in AVAILABLE_ENDPOINTS:
            print(f"\n{Fore.BLUE}Testing endpoint: {endpoint}{Style.RESET_ALL}")
            try:
                response = self.request(endpoint)
                status = f"{response.status_code} {response.reason}"
                
                if response.status_code >= 200 and response.status_code < 300:
                    status_color = Fore.GREEN
                elif response.status_code >= 400 and response.status_code < 500:
                    status_color = Fore.YELLOW
                else:
                    status_color = Fore.RED
                
                try:
                    # Try to parse response as JSON
                    result = json.dumps(response.json(), indent=2)
                    print(f"{status_color}Status: {status}{Style.RESET_ALL}")
                    print(f"{Fore.CYAN}Response:{Style.RESET_ALL}")
                    print(result)
                    
                    # Add to results table
                    results_table.add_row([
                        endpoint,
                        f"{status_color}{status}{Style.RESET_ALL}",
                        (result[:60] + '...') if len(result) > 60 else result
                    ])
                    
                except ValueError:
                    # Handle non-JSON responses
                    result = response.text
                    print(f"{status_color}Status: {status}{Style.RESET_ALL}")
                    print(f"{Fore.CYAN}Response:{Style.RESET_ALL}")
                    print(result)
                    
                    # Add to results table
                    results_table.add_row([
                        endpoint, 
                        f"{status_color}{status}{Style.RESET_ALL}",
                        (result[:60] + '...') if len(result) > 60 else result
                    ])
                    
            except Exception as e:
                # Handle request errors
                print(f"{Fore.RED}Error: {e}{Style.RESET_ALL}")
                results_table.add_row([
                    endpoint,
                    f"{Fore.RED}Error{Style.RESET_ALL}",
                    f"{Fore.RED}{str(e)}{Style.RESET_ALL}"
                ])

        # Print summary table
        print(f"\n{Fore.BLUE}Summary of API Endpoint Tests:{Style.RESET_ALL}")
        print(results_table)


def main() -> None:
    """Main function to parse arguments and run the client."""
    parser = argparse.ArgumentParser(description="mTLS Client for API Testing")
    
    parser.add_argument(
        "--url", 
        default=DEFAULT_SERVER_URL,
        help=f"Server URL (default: {DEFAULT_SERVER_URL})"
    )
    
    parser.add_argument(
        "--ca-cert", 
        default=DEFAULT_CA_CERT,
        help=f"Path to CA certificate (default: {DEFAULT_CA_CERT})"
    )
    
    parser.add_argument(
        "--client-cert", 
        default=DEFAULT_CLIENT_CERT,
        help=f"Path to client certificate (default: {DEFAULT_CLIENT_CERT})"
    )
    
    parser.add_argument(
        "--client-key", 
        default=DEFAULT_CLIENT_KEY,
        help=f"Path to client key (default: {DEFAULT_CLIENT_KEY})"
    )
    
    parser.add_argument(
        "--no-client-auth", 
        action="store_true",
        help="Disable client certificate authentication (server auth only)"
    )
    
    parser.add_argument(
        "--endpoint", 
        default=None,
        help="Test a specific endpoint (default: test all endpoints)"
    )

    args = parser.parse_args()

    # Handle the no-client-auth option
    client_cert = None if args.no_client_auth else args.client_cert
    client_key = None if args.no_client_auth else args.client_key

    # Create mTLS client
    client = MTLSClient(
        server_url=args.url,
        ca_cert_path=args.ca_cert,
        client_cert_path=client_cert,
        client_key_path=client_key
    )

    # Test endpoints
    if args.endpoint:
        response = client.request(args.endpoint)
        try:
            print(json.dumps(response.json(), indent=2))
        except ValueError:
            print(response.text)
    else:
        client.test_all_endpoints()


if __name__ == "__main__":
    main()
