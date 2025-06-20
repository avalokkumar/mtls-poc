/**
 * handshake-simulator.js - mTLS handshake simulation visualization
 */

document.addEventListener('DOMContentLoaded', function() {
  // Setup handshake simulation
  const startHandshakeBtn = document.getElementById('start-handshake');
  const resetHandshakeBtn = document.getElementById('reset-handshake');
  const useValidCertCheck = document.getElementById('use-valid-cert');
  
  // Initialize simulator
  initHandshakeSimulator();
  
  // Set up event listeners
  startHandshakeBtn.addEventListener('click', startHandshake);
  resetHandshakeBtn.addEventListener('click', resetHandshake);
  useValidCertCheck.addEventListener('change', resetHandshake);
});

/**
 * Initialize handshake simulator
 */
function initHandshakeSimulator() {
  // Reset to initial state
  resetHandshake();
}

/**
 * Start handshake simulation
 */
function startHandshake() {
  // Disable controls during simulation
  document.getElementById('start-handshake').disabled = true;
  document.getElementById('use-valid-cert').disabled = true;
  
  // Get valid certificate setting
  const useValidCert = document.getElementById('use-valid-cert').checked;
  
  // Reset status
  resetHandshakeSteps();
  
  // Client status
  const clientStatus = document.getElementById('client-status-text');
  const clientBadge = document.getElementById('client-certificate-badge');
  
  // Server status
  const serverStatus = document.getElementById('server-status-text');
  const serverBadge = document.getElementById('server-certificate-badge');
  
  // Style certificates
  serverBadge.className = 'certificate-badge valid';
  if (useValidCert) {
    clientBadge.className = 'certificate-badge valid';
  } else {
    clientBadge.className = 'certificate-badge invalid';
  }
  
  // Run the handshake simulation with appropriate delays
  // Step 1: Client Hello
  setTimeout(() => {
    activateStep('step-1');
    clientStatus.textContent = 'Sending Client Hello...';
    
    // Animate message from client to server
    animateMessage('left-to-right');
    
  }, 500);
  
  // Step 2: Server Hello + Certificate
  setTimeout(() => {
    completeStep('step-1');
    activateStep('step-2');
    serverStatus.textContent = 'Sending Server Hello + Certificate';
    
    // Animate message from server to client
    animateMessage('right-to-left');
    
  }, 2000);
  
  // Step 3: Client Certificate
  setTimeout(() => {
    completeStep('step-2');
    activateStep('step-3');
    clientStatus.textContent = 'Sending Client Certificate...';
    
    // Animate message from client to server
    animateMessage('left-to-right');
    
  }, 3500);
  
  // Step 4: Certificate Verification
  setTimeout(() => {
    completeStep('step-3');
    activateStep('step-4');
    serverStatus.textContent = 'Verifying Client Certificate...';
    
  }, 5000);
  
  // Step 5: Handshake Complete or Failed
  setTimeout(() => {
    let success = false;
    
    if (useValidCert) {
      // Successful handshake
      success = true;
      completeStep('step-4');
      successStep('step-5');
      serverStatus.textContent = 'Client Certificate Verified ✅';
      clientStatus.textContent = 'Connection Established ✅';
    } else {
      // Failed handshake
      failStep('step-4');
      failStep('step-5');
      serverStatus.textContent = 'Certificate Verification Failed ❌';
      clientStatus.textContent = 'Connection Rejected ❌';
    }
    
    // Enable reset button
    document.getElementById('reset-handshake').focus();
    
  }, 6500);
}

/**
 * Reset handshake simulation to initial state
 */
function resetHandshake() {
  // Reset all steps
  resetHandshakeSteps();
  
  // Reset status texts
  document.getElementById('client-status-text').textContent = 'Ready';
  document.getElementById('server-status-text').textContent = 'Ready';
  
  // Reset certificate badges
  document.getElementById('client-certificate-badge').className = 'certificate-badge';
  document.getElementById('server-certificate-badge').className = 'certificate-badge';
  
  // Enable controls
  document.getElementById('start-handshake').disabled = false;
  document.getElementById('use-valid-cert').disabled = false;
  
  // Remove any lingering animations
  removeAnimations();
}

/**
 * Reset handshake step indicators
 */
function resetHandshakeSteps() {
  const steps = ['step-1', 'step-2', 'step-3', 'step-4', 'step-5'];
  steps.forEach(stepId => {
    const stepElement = document.getElementById(stepId);
    stepElement.classList.remove('active', 'success', 'fail');
    const badge = stepElement.querySelector('.badge');
    badge.className = 'badge bg-secondary';
  });
}

/**
 * Activate a step (highlight it as in progress)
 * @param {string} stepId - ID of the step element
 */
function activateStep(stepId) {
  const stepElement = document.getElementById(stepId);
  stepElement.classList.add('active');
  const badge = stepElement.querySelector('.badge');
  badge.className = 'badge bg-primary';
}

/**
 * Mark a step as completed successfully
 * @param {string} stepId - ID of the step element
 */
function completeStep(stepId) {
  const stepElement = document.getElementById(stepId);
  stepElement.classList.remove('active');
  stepElement.classList.add('success');
  const badge = stepElement.querySelector('.badge');
  badge.className = 'badge bg-success';
}

/**
 * Mark a step as failed
 * @param {string} stepId - ID of the step element
 */
function failStep(stepId) {
  const stepElement = document.getElementById(stepId);
  stepElement.classList.remove('active');
  stepElement.classList.add('fail');
  const badge = stepElement.querySelector('.badge');
  badge.className = 'badge bg-danger';
}

/**
 * Animate message transfer between client and server
 * @param {string} direction - Direction of animation ('left-to-right' or 'right-to-left')
 */
function animateMessage(direction) {
  // Create message arrow element
  const arrow = document.createElement('div');
  arrow.className = `message-arrow ${direction}`;
  arrow.innerHTML = '<i class="bi bi-envelope-fill"></i>';
  
  // Add arrow to handshake visualization container
  document.querySelector('.handshake-visualization').appendChild(arrow);
  
  // Remove arrow after animation completes
  setTimeout(() => {
    if (arrow.parentNode) {
      arrow.parentNode.removeChild(arrow);
    }
  }, 1500);
}

/**
 * Remove any lingering animation elements
 */
function removeAnimations() {
  const arrows = document.querySelectorAll('.message-arrow');
  arrows.forEach(arrow => {
    if (arrow.parentNode) {
      arrow.parentNode.removeChild(arrow);
    }
  });
}
