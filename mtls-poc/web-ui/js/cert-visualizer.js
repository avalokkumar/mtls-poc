/**
 * cert-visualizer.js - Certificate visualization utilities for mTLS Certificate Manager
 */

/**
 * Render certificate details to the specified element
 * @param {HTMLElement} element - Element to render certificate details into
 * @param {Object} cert - Certificate data object
 */
function renderCertificateDetails(element, cert) {
  // Clear element
  element.innerHTML = '';
  
  if (!cert) {
    element.innerHTML = `
      <div class="alert alert-warning">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        Certificate data not available
      </div>
    `;
    return;
  }
  
  // Create certificate overview
  const overview = document.createElement('div');
  overview.className = 'cert-overview mb-4';
  
  // Calculate certificate status
  let statusClass = 'cert-validity-ok';
  let statusIcon = 'bi-check-circle-fill';
  let statusText = 'Valid';
  
  const now = new Date();
  const validFrom = new Date(cert.validFrom);
  const validTo = new Date(cert.validTo);
  
  if (now < validFrom) {
    statusClass = 'cert-validity-warning';
    statusIcon = 'bi-exclamation-circle-fill';
    statusText = 'Not Yet Valid';
  } else if (now > validTo) {
    statusClass = 'cert-validity-expired';
    statusIcon = 'bi-x-circle-fill';
    statusText = 'Expired';
  }
  
  const daysRemaining = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));
  
  // Add certificate status header
  overview.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h5 class="mb-0">
        <i class="bi bi-file-earmark-text me-2"></i>
        ${cert.subject.CN || 'Certificate'}
      </h5>
      <div class="${statusClass}">
        <i class="bi ${statusIcon} me-1"></i>
        ${statusText}
        ${now < validTo ? `(${daysRemaining} days remaining)` : ''}
      </div>
    </div>
  `;
  
  element.appendChild(overview);
  
  // Create container for certificate details
  const detailsContainer = document.createElement('div');
  detailsContainer.className = 'cert-details mb-4';
  
  // Create tabs for different certificate sections
  detailsContainer.innerHTML = `
    <ul class="nav nav-tabs" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="basic-tab-${cert.id}" data-bs-toggle="tab" 
          data-bs-target="#basic-${cert.id}" type="button" role="tab">
          Basic Info
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="subject-tab-${cert.id}" data-bs-toggle="tab" 
          data-bs-target="#subject-${cert.id}" type="button" role="tab">
          Subject
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="issuer-tab-${cert.id}" data-bs-toggle="tab" 
          data-bs-target="#issuer-${cert.id}" type="button" role="tab">
          Issuer
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="validity-tab-${cert.id}" data-bs-toggle="tab" 
          data-bs-target="#validity-${cert.id}" type="button" role="tab">
          Validity
        </button>
      </li>
    </ul>
    <div class="tab-content p-3 border border-top-0 rounded-bottom">
      <div class="tab-pane fade show active" id="basic-${cert.id}" role="tabpanel">
        ${renderBasicInfo(cert)}
      </div>
      <div class="tab-pane fade" id="subject-${cert.id}" role="tabpanel">
        ${renderSubject(cert.subject)}
      </div>
      <div class="tab-pane fade" id="issuer-${cert.id}" role="tabpanel">
        ${renderIssuer(cert.issuer)}
      </div>
      <div class="tab-pane fade" id="validity-${cert.id}" role="tabpanel">
        ${renderValidity(cert)}
      </div>
    </div>
  `;
  
  element.appendChild(detailsContainer);
  
  // Create certificate chain visualization
  const chainContainer = document.createElement('div');
  chainContainer.className = 'cert-chain-container';
  chainContainer.innerHTML = `
    <h5 class="mb-3">Certificate Chain</h5>
    ${renderCertificateChain(cert)}
  `;
  
  element.appendChild(chainContainer);
  
  // Add export options
  const exportContainer = document.createElement('div');
  exportContainer.className = 'mt-4 text-center';
  exportContainer.innerHTML = `
    <div class="btn-group">
      <button class="btn btn-outline-primary" onclick="downloadCertificatePEM('${cert.id}')">
        <i class="bi bi-download me-2"></i>Download PEM
      </button>
      <button class="btn btn-outline-primary" onclick="viewCertificateDetails('${cert.id}')">
        <i class="bi bi-search me-2"></i>View Raw Details
      </button>
    </div>
  `;
  
  element.appendChild(exportContainer);
}

/**
 * Render basic certificate information
 * @param {Object} cert - Certificate data
 * @returns {string} HTML markup
 */
function renderBasicInfo(cert) {
  return `
    <div class="cert-property">
      <span class="cert-property-name">Serial Number:</span>
      <span class="cert-property-value">${cert.serialNumber || 'Not available'}</span>
    </div>
    <div class="cert-property">
      <span class="cert-property-name">Version:</span>
      <span class="cert-property-value">V${cert.version || '3'}</span>
    </div>
    <div class="cert-property">
      <span class="cert-property-name">Signature Algorithm:</span>
      <span class="cert-property-value">${cert.signatureAlgorithm || 'Not available'}</span>
    </div>
    <div class="cert-property">
      <span class="cert-property-name">Public Key Algorithm:</span>
      <span class="cert-property-value">${cert.publicKeyAlgorithm || 'Not available'}</span>
    </div>
    <div class="cert-property">
      <span class="cert-property-name">Key Size:</span>
      <span class="cert-property-value">${cert.keySize || 'Not available'} bits</span>
    </div>
  `;
}

/**
 * Render certificate subject information
 * @param {Object} subject - Certificate subject
 * @returns {string} HTML markup
 */
function renderSubject(subject) {
  if (!subject) {
    return '<div class="alert alert-warning">Subject information not available</div>';
  }
  
  let html = '';
  
  // Map full names for subject fields
  const fieldNames = {
    'CN': 'Common Name',
    'O': 'Organization',
    'OU': 'Organizational Unit',
    'L': 'Locality',
    'ST': 'State/Province',
    'C': 'Country',
    'emailAddress': 'Email Address'
  };
  
  // Add each subject field
  for (const [key, value] of Object.entries(subject)) {
    const displayName = fieldNames[key] || key;
    html += `
      <div class="cert-property">
        <span class="cert-property-name">${displayName}:</span>
        <span class="cert-property-value">${value}</span>
      </div>
    `;
  }
  
  // If no subject fields were found
  if (html === '') {
    html = '<div class="alert alert-warning">No subject details available</div>';
  }
  
  return html;
}

/**
 * Render certificate issuer information
 * @param {Object} issuer - Certificate issuer
 * @returns {string} HTML markup
 */
function renderIssuer(issuer) {
  if (!issuer) {
    return '<div class="alert alert-warning">Issuer information not available</div>';
  }
  
  let html = '';
  
  // Map full names for issuer fields
  const fieldNames = {
    'CN': 'Common Name',
    'O': 'Organization',
    'OU': 'Organizational Unit',
    'L': 'Locality',
    'ST': 'State/Province',
    'C': 'Country',
    'emailAddress': 'Email Address'
  };
  
  // Add each issuer field
  for (const [key, value] of Object.entries(issuer)) {
    const displayName = fieldNames[key] || key;
    html += `
      <div class="cert-property">
        <span class="cert-property-name">${displayName}:</span>
        <span class="cert-property-value">${value}</span>
      </div>
    `;
  }
  
  // If no issuer fields were found
  if (html === '') {
    html = '<div class="alert alert-warning">No issuer details available</div>';
  }
  
  return html;
}

/**
 * Render certificate validity information
 * @param {Object} cert - Certificate data
 * @returns {string} HTML markup
 */
function renderValidity(cert) {
  const validFrom = new Date(cert.validFrom);
  const validTo = new Date(cert.validTo);
  const now = new Date();
  
  // Calculate days remaining or days expired
  let daysText = '';
  if (now > validTo) {
    const daysExpired = Math.ceil((now - validTo) / (1000 * 60 * 60 * 24));
    daysText = `<span class="cert-validity-expired">(Expired ${daysExpired} days ago)</span>`;
  } else {
    const daysRemaining = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));
    daysText = `<span class="cert-validity-ok">(${daysRemaining} days remaining)</span>`;
  }
  
  // Format date options
  const dateOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  };
  
  return `
    <div class="cert-property">
      <span class="cert-property-name">Not Valid Before:</span>
      <span class="cert-property-value">${validFrom.toLocaleDateString(undefined, dateOptions)}</span>
    </div>
    <div class="cert-property">
      <span class="cert-property-name">Not Valid After:</span>
      <span class="cert-property-value">
        ${validTo.toLocaleDateString(undefined, dateOptions)}
        ${daysText}
      </span>
    </div>
    <div class="cert-property">
      <span class="cert-property-name">Valid For:</span>
      <span class="cert-property-value">
        ${Math.ceil((validTo - validFrom) / (1000 * 60 * 60 * 24))} days
      </span>
    </div>
  `;
}

/**
 * Render certificate chain visualization
 * @param {Object} cert - Certificate data
 * @returns {string} HTML markup
 */
function renderCertificateChain(cert) {
  // Simplified chain visualization for the PoC
  const isSelfSigned = cert.subject.CN === cert.issuer.CN;
  
  if (isSelfSigned) {
    // Self-signed certificate (CA)
    return `
      <div class="cert-chain">
        <div class="cert-chain-item root-ca">
          <strong>${cert.subject.CN || 'Root CA'}</strong>
          <div><small class="text-muted">Self-signed Root Certificate</small></div>
        </div>
      </div>
    `;
  } else {
    // Regular certificate with separate issuer
    const isServer = cert.subject.CN === 'localhost';
    const certType = isServer ? 'server' : 'client';
    
    return `
      <div class="cert-chain">
        <div class="cert-chain-item root-ca">
          <strong>${cert.issuer.CN || 'Root CA'}</strong>
          <div><small class="text-muted">Certificate Authority</small></div>
        </div>
        <div class="cert-chain-arrow">
          <i class="bi bi-arrow-down"></i>
          <div><small>Signs</small></div>
        </div>
        <div class="cert-chain-item ${certType}">
          <strong>${cert.subject.CN || 'Certificate'}</strong>
          <div><small class="text-muted">${isServer ? 'Server Certificate' : 'Client Certificate'}</small></div>
        </div>
      </div>
    `;
  }
}

/**
 * Download certificate in PEM format
 * @param {string} certId - Certificate ID
 */
function downloadCertificatePEM(certId) {
  fetch(`/api/certificates/${certId}/pem`)
    .then(response => response.text())
    .then(pem => {
      // Create download
      const blob = new Blob([pem], { type: 'application/x-pem-file' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${certId}.pem`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    })
    .catch(error => {
      console.error('Error downloading certificate PEM:', error);
      alert('Error downloading certificate. Check console for details.');
    });
}

/**
 * View raw certificate details
 * @param {string} certId - Certificate ID
 */
function viewCertificateDetails(certId) {
  fetch(`/api/certificates/${certId}/details`)
    .then(response => response.text())
    .then(details => {
      // Create modal to display details
      const modal = document.createElement('div');
      modal.className = 'modal fade';
      modal.id = 'certDetailsModal';
      modal.setAttribute('tabindex', '-1');
      modal.setAttribute('aria-hidden', 'true');
      
      modal.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Certificate Details</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <pre style="white-space: pre-wrap; font-family: monospace;">${details}</pre>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Show modal
      const modalObj = new bootstrap.Modal(modal);
      modalObj.show();
      
      // Remove modal from DOM when hidden
      modal.addEventListener('hidden.bs.modal', function() {
        document.body.removeChild(modal);
      });
    })
    .catch(error => {
      console.error('Error viewing certificate details:', error);
      alert('Error viewing certificate details. Check console for details.');
    });
}
