/**
 * Authentication logic for iiitn-auth-cli
 * Replicates the CRISPR AuthBahn browser extension authentication flow.
 */

const axios = require('axios');

// Constants matching the browser extension
const LOGIN_URL = 'https://192.168.55.253:1003/login';
const KEEPALIVE_URL = 'https://192.168.55.253:1003/keepalive';

// Browser-like headers matching the extension
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0',
};

/**
 * Perform login matching the browser extension flow
 * POST form data ft_un/ft_pd to the login endpoint
 */
async function login(username, password) {
  const formData = {
    ft_un: username,
    ft_pd: password
  };

  try {
    const response = await axios.post(LOGIN_URL, formData, { headers: HEADERS, timeout: 30000 });
    
    // Check for success indicators in response
    const responseText = response.data.toString().toLowerCase();
    const successIndicators = ['login successful', 'authenticated', 'welcome'];
    const hasSuccessIndicator = successIndicators.some(indicator => responseText.includes(indicator));
    
    // Check if keepalive is in the response (extension behavior)
    const hasKeepalive = responseText.includes('keepalive');
    
    if (hasSuccessIndicator || hasKeepalive || response.status === 200) {
      return true; // Login success
    }

    // Continue anyway - we'll verify via keepalive
    return true;

  } catch (error) {
    if (error.response) {
      // Server responded with an error status
      throw new Error(`Login failed: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      // No response received
      throw new Error('Login failed: No response received - connection error');
    } else {
      // Something else went wrong
      throw new Error(`Login failed: ${error.message}`);
    }
  }
}

/**
 * Check if the connection is alive by pinging the keepalive endpoint
 * Returns true if status is 200, false otherwise
 */
async function checkKeepalive() {
  try {
    const response = await axios.get(KEEPALIVE_URL, { headers: HEADERS, timeout: 15000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * Exponential backoff delay calculation
 * @param {number} attempt - Retry attempt number (0-indexed)
 * @returns {number} Delay in seconds (1s, 2s, 4s, 8s, 16s with jitter)
 */
function exponentialBackoff(attempt) {
  const baseDelay = Math.pow(2, attempt); // 1, 2, 4, 8, 16
  const jitter = baseDelay * 0.1 * (Math.random() * 2 - 1); // up to 10% jitter
  return Math.round(baseDelay + jitter);
}

module.exports = {
  login,
  checkKeepalive,
  exponentialBackoff
};