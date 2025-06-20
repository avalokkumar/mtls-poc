/**
 * api-routes.js - API routes for the mTLS Certificate Manager
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Create router
const router = express.Router();

// Certificate paths
const CERT_DIR = path.join(__dirname, '..', 'certs');
const CA_CERT = path.join(CERT_DIR, 'ca.crt');
const CA_KEY = path.join(CERT_DIR, 'ca.key');
const SERVER_CERT = path.join(CERT_DIR, 'server.crt');
const SERVER_KEY = path.join(CERT_DIR, 'server.key');

/**
 * Get certificate status
 */
router.get('/certificates/status', async (req, res) => {
  try {
    // Check if certificate directory exists
    if (!fs.existsSync(CERT_DIR)) {
      return res.json({
        ca: null,
        server: null,
        clients: []
      });
    }
    
    // Get certificate files
    const files = fs.readdirSync(CERT_DIR);
    
    // Function to extract certificate info
    const getCertInfo = async (certFile) => {
      try {
        const { stdout } = await exec(`openssl x509 -in ${certFile} -noout -subject -issuer -dates`);
        
        // Extract subject
        const subjectMatch = stdout.match(/subject=([^\n]+)/);
        const subject = {};
        if (subjectMatch) {
          const subjectParts = subjectMatch[1].split(',').map(s => s.trim());
          subjectParts.forEach(part => {
            const [key, value] = part.split('=').map(s => s.trim());
            if (key && value) {
              subject[key] = value;
            }
          });
        }
        
        // Extract issuer
        const issuerMatch = stdout.match(/issuer=([^\n]+)/);
        const issuer = {};
        if (issuerMatch) {
          const issuerParts = issuerMatch[1].split(',').map(s => s.trim());
          issuerParts.forEach(part => {
            const [key, value] = part.split('=').map(s => s.trim());
            if (key && value) {
              issuer[key] = value;
            }
          });
        }
        
        // Extract validity
        const notBeforeMatch = stdout.match(/notBefore=([^\n]+)/);
        const notAfterMatch = stdout.match(/notAfter=([^\n]+)/);
        
        return {
          subject,
          issuer,
          validFrom: notBeforeMatch ? notBeforeMatch[1] : null,
          validUntil: notAfterMatch ? notAfterMatch[1] : null,
          isSelfSigned: subject.CN === issuer.CN
        };
      } catch (error) {
        console.error(`Error processing certificate ${certFile}:`, error);
        return null;
      }
    };
    
    // Process CA certificate
    let ca = null;
    if (fs.existsSync(CA_CERT)) {
      ca = await getCertInfo(CA_CERT);
    }
    
    // Process server certificate
    let server = null;
    if (fs.existsSync(SERVER_CERT)) {
      server = await getCertInfo(SERVER_CERT);
    }
    
    // Process client certificates
    const clients = [];
    for (const file of files) {
      if (file.match(/^client.*\.crt$/)) {
        const certPath = path.join(CERT_DIR, file);
        const certInfo = await getCertInfo(certPath);
        if (certInfo) {
          clients.push({
            name: file.replace('.crt', ''),
            ...certInfo
          });
        }
      }
    }
    
    res.json({
      ca,
      server,
      clients
    });
  } catch (error) {
    console.error('Error getting certificate status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Get certificate details
 */
router.get('/certificates/:certType', async (req, res) => {
  try {
    const { certType } = req.params;
    let certFile;
    
    if (certType === 'ca') {
      certFile = CA_CERT;
    } else if (certType === 'server') {
      certFile = SERVER_CERT;
    } else if (certType.match(/^client[0-9]*/)) {
      certFile = path.join(CERT_DIR, `${certType}.crt`);
    } else {
      return res.status(400).json({
        success: false,
        message: `Invalid certificate type: ${certType}`
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(certFile)) {
      return res.status(404).json({
        success: false,
        message: `Certificate ${certType} not found`
      });
    }
    
    // Get certificate info
    const { stdout } = await exec(`openssl x509 -in ${certFile} -text -noout`);
    
    // Extract certificate info
    const subjectMatch = stdout.match(/Subject: ([^\n]+)/);
    const issuerMatch = stdout.match(/Issuer: ([^\n]+)/);
    const validityMatch = stdout.match(/Not Before: ([^\n]+)\s+Not After : ([^\n]+)/);
    const serialMatch = stdout.match(/Serial Number:\s*([^\n]+)/);
    const signatureAlgorithmMatch = stdout.match(/Signature Algorithm: ([^\n]+)/);
    const publicKeyMatch = stdout.match(/Public Key Algorithm: ([^\n]+)/);
    const keySizeMatch = stdout.match(/RSA Public-Key: \(([0-9]+) bit\)/);
    
    // Parse subject and issuer
    const parseNameParts = (nameStr) => {
      const parts = {};
      if (nameStr) {
        nameStr.split(',').map(s => s.trim()).forEach(part => {
          const [key, value] = part.split('=').map(s => s.trim());
          if (key && value) {
            parts[key] = value;
          }
        });
      }
      return parts;
    };
    
    const subject = subjectMatch ? parseNameParts(subjectMatch[1]) : {};
    const issuer = issuerMatch ? parseNameParts(issuerMatch[1]) : {};
    
    const certificate = {
      id: certType,
      subject,
      issuer,
      validFrom: validityMatch ? validityMatch[1] : null,
      validTo: validityMatch ? validityMatch[2] : null,
      serialNumber: serialMatch ? serialMatch[1].trim() : null,
      signatureAlgorithm: signatureAlgorithmMatch ? signatureAlgorithmMatch[1] : null,
      publicKeyAlgorithm: publicKeyMatch ? publicKeyMatch[1] : null,
      keySize: keySizeMatch ? keySizeMatch[1] : null,
      version: 3
    };
    
    res.json({
      success: true,
      certificate
    });
  } catch (error) {
    console.error(`Error getting certificate details:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get certificate PEM
 */
router.get('/certificates/:certType/pem', async (req, res) => {
  try {
    const { certType } = req.params;
    let certFile;
    
    if (certType === 'ca') {
      certFile = CA_CERT;
    } else if (certType === 'server') {
      certFile = SERVER_CERT;
    } else if (certType.match(/^client[0-9]*/)) {
      certFile = path.join(CERT_DIR, `${certType}.crt`);
    } else {
      return res.status(400).send(`Invalid certificate type: ${certType}`);
    }
    
    // Check if file exists
    if (!fs.existsSync(certFile)) {
      return res.status(404).send(`Certificate ${certType} not found`);
    }
    
    // Read and send the PEM file
    const certData = fs.readFileSync(certFile, 'utf-8');
    res.setHeader('Content-Type', 'application/x-pem-file');
    res.setHeader('Content-Disposition', `attachment; filename="${certType}.pem"`);
    res.send(certData);
  } catch (error) {
    console.error(`Error getting certificate PEM:`, error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * Get certificate details (raw text)
 */
router.get('/certificates/:certType/details', async (req, res) => {
  try {
    const { certType } = req.params;
    let certFile;
    
    if (certType === 'ca') {
      certFile = CA_CERT;
    } else if (certType === 'server') {
      certFile = SERVER_CERT;
    } else if (certType.match(/^client[0-9]*/)) {
      certFile = path.join(CERT_DIR, `${certType}.crt`);
    } else {
      return res.status(400).send(`Invalid certificate type: ${certType}`);
    }
    
    // Check if file exists
    if (!fs.existsSync(certFile)) {
      return res.status(404).send(`Certificate ${certType} not found`);
    }
    
    // Get certificate info
    const { stdout } = await exec(`openssl x509 -in ${certFile} -text -noout`);
    res.setHeader('Content-Type', 'text/plain');
    res.send(stdout);
  } catch (error) {
    console.error(`Error getting certificate details:`, error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

/**
 * Generate certificates
 */
router.post('/certificates/generate', (req, res) => {
  try {
    // Ensure certificate directory exists
    if (!fs.existsSync(CERT_DIR)) {
      fs.mkdirSync(CERT_DIR, { recursive: true });
    }
    
    const scriptPath = path.join(__dirname, '..', 'scripts');
    const caScript = path.join(scriptPath, 'create-ca.sh');
    const serverScript = path.join(scriptPath, 'create-server-cert.sh');
    const clientScript = path.join(scriptPath, 'create-client-cert.sh');
    
    // Execute CA script
    const caProcess = spawn(caScript, [], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
      shell: true
    });
    
    // Handle CA process completion
    caProcess.on('close', (caCode) => {
      if (caCode !== 0) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate CA certificate'
        });
      }
      
      // Execute server certificate script
      const serverProcess = spawn(serverScript, [], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe',
        shell: true
      });
      
      // Handle server process completion
      serverProcess.on('close', (serverCode) => {
        if (serverCode !== 0) {
          return res.status(500).json({
            success: false,
            message: 'Failed to generate server certificate'
          });
        }
        
        // Generate client certificates in sequence
        generateClientCertificate('client1', () => {
          generateClientCertificate('client2', () => {
            res.json({
              success: true,
              message: 'Certificates generated successfully'
            });
          });
        });
      });
    });
    
    function generateClientCertificate(clientName, callback) {
      const clientProcess = spawn(clientScript, [clientName], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe',
        shell: true
      });
      
      clientProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Failed to generate ${clientName} certificate`);
        }
        callback();
      });
    }
  } catch (error) {
    console.error('Error generating certificates:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * API test endpoint
 */
router.post('/test', async (req, res) => {
  try {
    const { endpoint, client } = req.body;
    
    // Prepare curl command
    let curlCmd = `curl -s`;
    
    // Add certificate options
    curlCmd += ` --cacert ${CA_CERT}`;
    
    // Add client certificate if specified
    if (client === 'client1' || client === 'client2') {
      const clientCert = path.join(CERT_DIR, `${client}.crt`);
      const clientKey = path.join(CERT_DIR, `${client}.key`);
      
      if (fs.existsSync(clientCert) && fs.existsSync(clientKey)) {
        curlCmd += ` --cert ${clientCert} --key ${clientKey}`;
      } else {
        return res.status(400).json({
          success: false,
          error: `Client certificate ${client} not found`
        });
      }
    } else if (client === 'expired') {
      // Use expired certificate
      const expiredCert = path.join(CERT_DIR, 'expired-client.crt');
      const expiredKey = path.join(CERT_DIR, 'expired-client.key');
      
      if (fs.existsSync(expiredCert) && fs.existsSync(expiredKey)) {
        curlCmd += ` --cert ${expiredCert} --key ${expiredKey}`;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Expired certificate not found. Please generate it first.'
        });
      }
    }
    // Otherwise, no client cert (testing rejection)
    
    // Add endpoint
    curlCmd += ` https://localhost:8443${endpoint}`;
    
    // Execute curl command
    try {
      const { stdout, stderr } = await exec(curlCmd);
      
      // Parse response
      let responseData;
      try {
        responseData = JSON.parse(stdout);
      } catch {
        responseData = stdout;
      }
      
      res.json({
        success: true,
        statusCode: 200,
        statusText: 'OK',
        response: responseData
      });
    } catch (curlError) {
      // Parse curl error
      const errorMatch = curlError.stderr?.match(/curl: \([0-9]+\) (.+)$/m);
      const errorMessage = errorMatch ? errorMatch[1] : curlError.message;
      
      res.json({
        success: false,
        statusCode: curlError.code || 500,
        statusText: 'Error',
        error: errorMessage,
        stderr: curlError.stderr
      });
    }
  } catch (error) {
    console.error('API test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export the router
module.exports = router;
