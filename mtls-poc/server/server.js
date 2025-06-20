/**
 * Node.js HTTPS Server with Mutual TLS (mTLS) Authentication
 * 
 * This server requires clients to present valid certificates signed by our CA.
 * It demonstrates the core functionality of mTLS: both server and client
 * authenticate each other using X.509 certificates.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Server configuration
const PORT = 8443;
const HOST = 'localhost';

// Certificate paths (relative to project root)
const CERT_DIR = path.join(__dirname, '..', 'certs');
const SERVER_KEY = path.join(CERT_DIR, 'server.key');
const SERVER_CERT = path.join(CERT_DIR, 'server.crt');
const CA_CERT = path.join(CERT_DIR, 'ca.crt');

// Check if all required certificates exist
try {
  [SERVER_KEY, SERVER_CERT, CA_CERT].forEach(file => {
    if (!fs.existsSync(file)) {
      console.error(`❌ Error: File ${file} not found!`);
      console.error('Please run the certificate creation scripts first.');
      process.exit(1);
    }
  });
} catch (error) {
  console.error(`❌ Error checking certificates: ${error.message}`);
  process.exit(1);
}

// HTTPS server options with mTLS configuration
const options = {
  key: fs.readFileSync(SERVER_KEY),     // Server's private key
  cert: fs.readFileSync(SERVER_CERT),   // Server's certificate
  ca: fs.readFileSync(CA_CERT),         // CA certificate for client validation
  requestCert: true,                    // Request client certificate
  rejectUnauthorized: true,             // Reject connections without valid client cert
};

// Create HTTPS server
const server = https.createServer(options, (req, res) => {
  // Get client certificate information if available
  const cert = req.socket.getPeerCertificate();
  
  // Check if client provided a valid certificate
  if (req.client.authorized) {
    // Client certificate was valid
    res.writeHead(200, { 'Content-Type': 'application/json' });
    
    // Based on the requested path, send different responses
    switch(req.url) {
      case '/':
        res.end(JSON.stringify({
          success: true,
          message: `Hello, ${cert.subject.CN}! Your certificate was verified successfully.`,
          endpoint: 'root',
          clientDetails: {
            subject: cert.subject,
            issuer: cert.issuer,
            validFrom: cert.valid_from,
            validTo: cert.valid_to
          }
        }));
        break;
        
      case '/api/secure-data':
        res.end(JSON.stringify({
          success: true,
          message: 'You have access to the secure data API',
          endpoint: 'secure-data',
          secureData: {
            items: [
              { id: 1, name: 'Protected Resource 1' },
              { id: 2, name: 'Protected Resource 2' },
              { id: 3, name: 'Protected Resource 3' }
            ]
          }
        }));
        break;
        
      case '/api/status':
        res.end(JSON.stringify({
          success: true,
          message: 'Server status is healthy',
          endpoint: 'status',
          serverTime: new Date().toISOString(),
          uptime: process.uptime()
        }));
        break;
        
      default:
        res.end(JSON.stringify({
          success: true,
          message: 'Unknown endpoint requested',
          endpoint: req.url
        }));
    }
    
    // Log the successful access with client certificate details
    console.log(`✅ [${new Date().toISOString()}] Authenticated request from ${cert.subject.CN} to ${req.url}`);
    console.log(`   Subject: ${JSON.stringify(cert.subject)}`);
    
  } else {
    // Client certificate was invalid or not provided
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      message: 'Client certificate validation failed',
      reason: req.client.authorizationError
    }));
    
    // Log the unauthorized access attempt
    console.error(`❌ [${new Date().toISOString()}] Unauthorized access attempt to ${req.url}`);
    if (req.client.authorizationError) {
      console.error(`   Error: ${req.client.authorizationError}`);
    }
  }
});

// Start the HTTPS server
server.listen(PORT, HOST, () => {
  console.log('\n🔒 mTLS Authentication Demo Server\n');
  console.log(`🚀 Server running at https://${HOST}:${PORT}/`);
  console.log('✅ Server certificate loaded successfully');
  console.log('✅ CA certificate loaded for client validation');
  console.log('\n📝 API Endpoints:');
  console.log('   - /                 : Root endpoint with certificate details');
  console.log('   - /api/secure-data  : Example protected data API');
  console.log('   - /api/status       : Server status information\n');
  console.log('⚠️  All endpoints require a valid client certificate!\n');
});

// Handle server errors
server.on('error', (error) => {
  console.error(`❌ Server error: ${error.message}`);
  
  // Provide more useful information for common errors
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please try a different port.`);
  } else if (error.code === 'EACCES') {
    console.error(`Insufficient permissions to bind to port ${PORT}.`);
  }
  
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});
