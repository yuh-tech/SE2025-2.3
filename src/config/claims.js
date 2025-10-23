/**
 * Định nghĩa các Claims (thuộc tính người dùng) được hỗ trợ
 * 
 * Claims là các thông tin về người dùng được trả về trong ID Token
 * và UserInfo endpoint
 */

const claims = {
  // Standard OpenID Connect Claims
  sub: {
    type: 'string',
    description: 'Subject - Unique identifier for the user'
  },
  name: {
    type: 'string',
    description: 'Full name'
  },
  given_name: {
    type: 'string',
    description: 'Given name(s) or first name(s)'
  },
  family_name: {
    type: 'string',
    description: 'Surname(s) or last name(s)'
  },
  middle_name: {
    type: 'string',
    description: 'Middle name(s)'
  },
  nickname: {
    type: 'string',
    description: 'Casual name'
  },
  preferred_username: {
    type: 'string',
    description: 'Shorthand name by which the End-User wishes to be referred to'
  },
  profile: {
    type: 'string',
    description: 'Profile page URL'
  },
  picture: {
    type: 'string',
    description: 'Profile picture URL'
  },
  website: {
    type: 'string',
    description: 'Web page or blog URL'
  },
  email: {
    type: 'string',
    description: 'Email address'
  },
  email_verified: {
    type: 'boolean',
    description: 'True if the email address has been verified'
  },
  gender: {
    type: 'string',
    description: 'Gender'
  },
  birthdate: {
    type: 'string',
    description: 'Birthday in YYYY-MM-DD format'
  },
  zoneinfo: {
    type: 'string',
    description: 'Time zone (e.g., Europe/Paris)'
  },
  locale: {
    type: 'string',
    description: 'Locale (e.g., en-US)'
  },
  phone_number: {
    type: 'string',
    description: 'Phone number'
  },
  phone_number_verified: {
    type: 'boolean',
    description: 'True if the phone number has been verified'
  },
  address: {
    type: 'object',
    description: 'Postal address',
    properties: {
      formatted: 'Full mailing address',
      street_address: 'Street address component',
      locality: 'City or locality',
      region: 'State, province, prefecture, or region',
      postal_code: 'Zip code or postal code',
      country: 'Country name'
    }
  },
  updated_at: {
    type: 'number',
    description: 'Time the information was last updated (seconds since Unix epoch)'
  },
  
  // Custom claims (tuỳ chỉnh theo nhu cầu)
  role: {
    type: 'string',
    description: 'User role in the system'
  },
  roles: {
    type: 'array',
    description: 'Array of user roles'
  },
  permissions: {
    type: 'array',
    description: 'Array of user permissions'
  },
  organization: {
    type: 'string',
    description: 'Organization name'
  },
  department: {
    type: 'string',
    description: 'Department name'
  }
};

/**
 * Lọc claims từ user data dựa trên requested scopes
 */
function filterClaims(userData, requestedClaims) {
  const result = {};
  
  requestedClaims.forEach(claimName => {
    if (userData[claimName] !== undefined && claims[claimName]) {
      result[claimName] = userData[claimName];
    }
  });
  
  return result;
}

module.exports = {
  claims,
  filterClaims
};

