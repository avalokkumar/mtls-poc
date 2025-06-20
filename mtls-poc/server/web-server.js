/**
 * web-server.js - HTTP server for the mTLS Certificate Manager web UI
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const apiRoutes = require('./api-routes');

// Create Express app
const app = express();
const PORT = process.env.PORT || 8088;

// Enable JSON body parsing
app.use(express.json());

// Enable CORS
app.use(cors());

// Serve static files from web-ui directory
app.use(express.static(path.join(__dirname, '..', 'web-ui')));

// API routes
app.use('/api', apiRoutes);

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-ui', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   mTLS Certificate Manager Web UI                            ║
║                                                              ║
║   Server running at:                                         ║
║   http://localhost:${PORT}                                   ║
║                                                              ║
║   Use this web interface to:                                 ║
║   • View and manage certificates                             ║
║   • Visualize the mTLS handshake process                     ║
║   • Test API endpoints with different client certificates    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Handle errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});
