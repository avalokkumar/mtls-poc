# Troubleshooting Guide for mTLS PoC

This document provides solutions for common issues that might occur when working with the Mutual TLS (mTLS) Proof of Concept.

## Certificate Issues

### Certificate Path Problems

**Issue**: Error messages about certificate files not being found.

**Solution**: 
- Ensure you're running the scripts from the correct directory (project root)
- Check that certificate paths are correct relative to where commands are executed
- Verify that all certificate files exist in the `certs` directory

```bash
# Check certificate files
ls -la certs/
```

### Certificate Verification Failures

**Issue**: Server rejects client certificate or client rejects server certificate.

**Solution**:
- Confirm all certificates are signed by the same CA
- Check certificate expiration dates
- Verify certificate Common Name (CN) values
- Ensure all certificates were created using the provided scripts

```bash
# View certificate details
openssl x509 -in certs/ca.crt -text -noout
openssl x509 -in certs/server.crt -text -noout
openssl x509 -in certs/client1.crt -text -noout

# Verify certificates against CA
openssl verify -CAfile certs/ca.crt certs/server.crt
openssl verify -CAfile certs/ca.crt certs/client1.crt
```

### Certificate Format Issues

**Issue**: "Wrong format" or encoding errors when using certificates.

**Solution**:
- Ensure certificates are in PEM format (text format with BEGIN/END CERTIFICATE markers)
- Check for line ending issues if files were transferred between systems
- Recreate certificates using the provided scripts

## Server Issues

### Server Won't Start

**Issue**: The Node.js server fails to start.

**Solution**:
- Check that Node.js (v14+) is installed
- Ensure certificate paths in server.js are correct
- Verify the server port (8443) is not already in use

```bash
# Check if port is in use
lsof -i :8443
# Or
netstat -tuln | grep 8443

# If port is in use, you can stop the process or change the port in server.js
```

### Permission Denied

**Issue**: "Permission denied" errors when starting the server.

**Solution**:
- Ensure you have read access to certificate files
- Check file permissions on server.js and certificates

```bash
# Fix permissions if needed
chmod 644 certs/*.crt certs/*.key
chmod +x server/server.js
```

## Client Issues

### Curl Client Failures

**Issue**: curl commands fail with SSL errors.

**Solution**:
- Ensure you're using the correct paths to certificate files
- Check that the server is running
- Try with the `-k` flag to disable certificate verification temporarily (for debugging only)

```bash
# Debug curl command with verbose output
curl -v --cacert certs/ca.crt --cert certs/client1.crt --key certs/client1.key https://localhost:8443/
```

### Python Client Issues

**Issue**: Python client fails to connect or shows SSL errors.

**Solution**:
- Make sure required packages are installed: `pip install -r clients/python/requirements.txt`
- Verify certificate paths in the Python client
- Check server availability
- Try running with explicit paths to certificates

```bash
# Run with explicit paths
python clients/python/client.py --ca-cert ./certs/ca.crt --client-cert ./certs/client1.crt --client-key ./certs/client1.key
```

## Certificate Generation Issues

### OpenSSL Errors

**Issue**: OpenSSL commands fail during certificate creation.

**Solution**:
- Ensure OpenSSL is installed
- Check for typos in commands
- Make sure the `certs` directory exists

```bash
# Verify OpenSSL installation
openssl version

# Create certs directory if needed
mkdir -p certs
```

### CA Serial File Issues

**Issue**: Errors about missing CA serial file.

**Solution**:
- Run create-ca.sh first before creating server or client certificates
- If needed, create a new serial file manually

```bash
# Create an empty serial file
echo '01' > certs/ca.srl
```

## General Debugging Tips

1. **Check logs**: Look at server console output for authentication errors
2. **Verify certificates**: Use OpenSSL to inspect and verify certificates
3. **Test connectivity**: Ensure the server is running and port is accessible
4. **Simplify testing**: Start with basic commands, then add complexity
5. **Regenerate certificates**: If in doubt, recreate all certificates from scratch

```bash
# Remove old certificates and generate new ones
rm -rf certs/*.crt certs/*.key certs/*.csr certs/*.srl
./scripts/create-ca.sh
./scripts/create-server-cert.sh
./scripts/create-client-cert.sh client1
./scripts/create-client-cert.sh client2
```
