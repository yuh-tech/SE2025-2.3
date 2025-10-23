/**
 * Định nghĩa các OAuth Scopes được hỗ trợ
 * 
 * Scopes xác định phạm vi quyền mà client được phép truy cập
 */

const scopes = {
  // OpenID Connect Core scopes
  openid: {
    description: 'OpenID Connect authentication',
    claims: ['sub']
  },
  profile: {
    description: 'Access to profile information',
    claims: ['name', 'family_name', 'given_name', 'middle_name', 'nickname', 
             'preferred_username', 'profile', 'picture', 'website', 'gender', 
             'birthdate', 'zoneinfo', 'locale', 'updated_at']
  },
  email: {
    description: 'Access to email address',
    claims: ['email', 'email_verified']
  },
  address: {
    description: 'Access to postal address',
    claims: ['address']
  },
  phone: {
    description: 'Access to phone number',
    claims: ['phone_number', 'phone_number_verified']
  },
  
  // Custom scopes cho API
  'api:read': {
    description: 'Read access to API resources',
    claims: []
  },
  'api:write': {
    description: 'Write access to API resources',
    claims: []
  },
  
  // Offline access cho refresh token
  offline_access: {
    description: 'Access to refresh tokens for offline access',
    claims: []
  }
};

/**
 * Lấy tất cả scope names
 */
function getAllScopes() {
  return Object.keys(scopes);
}

/**
 * Lấy description của một scope
 */
function getScopeDescription(scopeName) {
  return scopes[scopeName]?.description || scopeName;
}

/**
 * Lấy claims tương ứng với các scopes
 */
function getClaimsForScopes(requestedScopes) {
  const claims = new Set();
  
  requestedScopes.forEach(scope => {
    if (scopes[scope] && scopes[scope].claims) {
      scopes[scope].claims.forEach(claim => claims.add(claim));
    }
  });
  
  return Array.from(claims);
}

module.exports = {
  scopes,
  getAllScopes,
  getScopeDescription,
  getClaimsForScopes
};

