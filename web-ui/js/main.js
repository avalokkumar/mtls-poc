/**
 * main.js - Main JavaScript for mTLS Certificate Manager UI
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the UI components
  initializeDashboard();
  initializeCertificateTabs();
  initializeApiTest();
  
  // Setup listeners for navigation
  setupNavigation();
});

/**
 * Initialize the dashboard with certificate status
 */
function initializeDashboard() {
  // Get dashboard elements
  const caExpiry = document.getElementById('ca-expiry');
  const serverExpiry = document.getElementById('server-expiry');
  const clientCount = document.getElementById('client-count');
  const refreshButton = document.getElementById('refresh-certificates');
  const generateButton = document.getElementById('generate-certificates');
  
  // Load certificate status
  loadCertificateStatus();
  
  // Set up refresh button
  refreshButton.addEventListener('click', function() {
    loadCertificateStatus();
  });
  
  // Set up generate button
  generateButton.addEventListener('click', function() {
    generateCertificates();
  });
  
  function loadCertificateStatus() {
    // Show loading state
    caExpiry.textContent = 'Loading...';
    serverExpiry.textContent = 'Loading...';
    clientCount.textContent = 'Loading...';
    
    // Fetch certificate status from API
    fetch('/api/certificates/status')
      .then(response => response.json())
      .then(data => {
        // Update CA status
        if (data.ca) {
          const validUntil = new Date(data.ca.validUntil);
          const now = new Date();
          const daysRemaining = Math.ceil((validUntil - now) / (1000 * 60 * 60 * 24));
          
          caExpiry.textContent = `Valid for ${daysRemaining} days`;
          caExpiry.className = daysRemaining > 365 ? 'text-success' : 'text-warning';
        } else {
          caExpiry.textContent = 'Not found';
          caExpiry.className = 'text-danger';
        }
        
        // Update server status
        if (data.server) {
          const validUntil = new Date(data.server.validUntil);
          const now = new Date();
          const daysRemaining = Math.ceil((validUntil - now) / (1000 * 60 * 60 * 24));
          
          serverExpiry.textContent = `Valid for ${daysRemaining} days`;
          serverExpiry.className = daysRemaining > 30 ? 'text-success' : 'text-warning';
        } else {
          serverExpiry.textContent = 'Not found';
          serverExpiry.className = 'text-danger';
        }
        
        // Update client count
        if (data.clients && data.clients.length > 0) {
          clientCount.textContent = `${data.clients.length} certificates`;
          clientCount.className = 'text-success';
          
          // Update client certificates dropdown
          updateClientCertDropdown(data.clients);
        } else {
          clientCount.textContent = 'None found';
          clientCount.className = 'text-danger';
        }
      })
      .catch(error => {
        console.error('Error loading certificate status:', error);
        caExpiry.textContent = 'Error loading data';
        serverExpiry.textContent = 'Error loading data';
        clientCount.textContent = 'Error loading data';
        caExpiry.className = 'text-danger';
        serverExpiry.className = 'text-danger';
        clientCount.className = 'text-danger';
      });
  }
  
  function updateClientCertDropdown(clients) {
    const dropdown = document.getElementById('client-cert-dropdown');
    dropdown.innerHTML = ''; // Clear existing items
    
    clients.forEach(client => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'dropdown-item';
      a.href = `#${client.name}-content`;
      a.setAttribute('data-bs-toggle', 'tab');
      a.textContent = client.name;
      li.appendChild(a);
      dropdown.appendChild(li);
      
      // Ensure tab content exists
      let tabContent = document.getElementById(`${client.name}-content`);
      if (!tabContent) {
        // Create tab content if it doesn't exist
        const tabPane = document.createElement('div');
        tabPane.className = 'tab-pane fade';
        tabPane.id = `${client.name}-content`;
        tabPane.role = 'tabpanel';
        
        const detailsDiv = document.createElement('div');
        detailsDiv.id = `${client.name}-certificate-details`;
        detailsDiv.className = 'certificate-details';
        detailsDiv.innerHTML = `
          <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading ${client.name} certificate details...</p>
          </div>
        `;
        
        tabPane.appendChild(detailsDiv);
        document.getElementById('certificateTabsContent').appendChild(tabPane);
      }
    });
  }
  
  function generateCertificates() {
    // Disable button and show loading state
    generateButton.disabled = true;
    generateButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
    
    // Call API to generate certificates
    fetch('/api/certificates/generate', { method: 'POST' })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Certificates generated successfully!');
          loadCertificateStatus();
        } else {
          alert('Failed to generate certificates: ' + data.message);
        }
      })
      .catch(error => {
        console.error('Error generating certificates:', error);
        alert('Error generating certificates. Check console for details.');
      })
      .finally(() => {
        // Re-enable button
        generateButton.disabled = false;
        generateButton.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Generate New Certificates';
      });
  }
}

/**
 * Initialize certificate tabs and load certificate details
 */
function initializeCertificateTabs() {
  // Get elements
  const caTab = document.getElementById('ca-tab');
  const serverTab = document.getElementById('server-tab');
  const caDetails = document.getElementById('ca-certificate-details');
  const serverDetails = document.getElementById('server-certificate-details');
  
  // Load CA certificate details when CA tab is clicked
  caTab.addEventListener('click', function() {
    loadCertificateDetails('ca', caDetails);
  });
  
  // Load server certificate details when server tab is clicked
  serverTab.addEventListener('click', function() {
    loadCertificateDetails('server', serverDetails);
  });
  
  // Setup client certificate tab clicks
  document.getElementById('client-cert-dropdown').addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('dropdown-item')) {
      const clientName = e.target.textContent;
      const detailsElement = document.getElementById(`${clientName}-certificate-details`);
      loadCertificateDetails(clientName, detailsElement);
    }
  });
  
  // Load CA certificate details initially
  loadCertificateDetails('ca', caDetails);
  
  function loadCertificateDetails(certType, detailsElement) {
    // Show loading state
    detailsElement.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Loading ${certType} certificate details...</p>
      </div>
    `;
    
    // Fetch certificate details from API
    fetch(`/api/certificates/${certType}`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Render certificate details using cert-visualizer.js
          renderCertificateDetails(detailsElement, data.certificate);
        } else {
          detailsElement.innerHTML = `
            <div class="alert alert-danger">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              Failed to load certificate: ${data.message || 'Unknown error'}
            </div>
          `;
        }
      })
      .catch(error => {
        console.error(`Error loading ${certType} certificate:`, error);
        detailsElement.innerHTML = `
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            Error loading certificate. Check console for details.
          </div>
        `;
      });
  }
}

/**
 * Initialize API test form
 */
function initializeApiTest() {
  const form = document.getElementById('api-test-form');
  const responseStatus = document.getElementById('response-status');
  const responseData = document.getElementById('response-data');
  
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get selected endpoint and client
    const endpoint = document.getElementById('endpoint-select').value;
    const client = document.getElementById('client-select').value;
    
    // Show loading state
    responseStatus.textContent = 'Loading...';
    responseStatus.className = 'badge bg-info';
    responseData.textContent = 'Sending request...';
    
    // Make API request
    fetch('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, client })
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          responseStatus.textContent = `${data.statusCode} ${data.statusText}`;
          responseStatus.className = 'badge bg-success';
          responseData.textContent = JSON.stringify(data.response, null, 2);
        } else {
          responseStatus.textContent = data.error || 'Error';
          responseStatus.className = 'badge bg-danger';
          responseData.textContent = JSON.stringify(data, null, 2);
        }
      })
      .catch(error => {
        console.error('API test error:', error);
        responseStatus.textContent = 'Error';
        responseStatus.className = 'badge bg-danger';
        responseData.textContent = 'An error occurred while making the request. Check console for details.';
      });
  });
}

/**
 * Setup navigation highlighting
 */
function setupNavigation() {
  // Get all sections
  const sections = document.querySelectorAll('section');
  
  // Get all nav links
  const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
  
  // Add click event listener to nav links
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      // Remove active class from all links
      navLinks.forEach(link => link.classList.remove('active'));
      
      // Add active class to clicked link
      this.classList.add('active');
    });
  });
  
  // Highlight active section on scroll
  window.addEventListener('scroll', function() {
    let current = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      if (window.pageYOffset >= sectionTop) {
        current = section.getAttribute('id');
      }
    });
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });
}
