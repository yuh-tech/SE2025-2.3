/**
 * User Service - Xác thực và quản lý người dùng
 * 
 * Trong production, service này nên kết nối với database thực
 * (PostgreSQL, MongoDB, MySQL, etc.)
 */

// Mock user database - trong thực tế nên lưu trong database
const USERS_DB = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123', // Trong thực tế phải hash password (bcrypt)
    email: 'admin@example.com',
    email_verified: true,
    name: 'Administrator',
    given_name: 'Admin',
    family_name: 'User',
    nickname: 'admin',
    picture: 'https://via.placeholder.com/150',
    profile: 'https://example.com/admin',
    website: 'https://example.com',
    gender: 'male',
    birthdate: '1990-01-01',
    zoneinfo: 'Asia/Ho_Chi_Minh',
    locale: 'vi-VN',
    phone_number: '+84901234567',
    phone_number_verified: true,
    address: {
      formatted: '123 Main St, Hanoi, Vietnam',
      street_address: '123 Main St',
      locality: 'Hanoi',
      region: 'Hanoi',
      postal_code: '100000',
      country: 'Vietnam',
    },
    role: 'admin',
    roles: ['admin', 'user'],
    permissions: ['read', 'write', 'delete'],
    organization: 'ACME Corporation',
    department: 'IT',
    updated_at: Math.floor(Date.now() / 1000),
  },
  {
    id: '2',
    username: 'user',
    password: 'user123',
    email: 'user@example.com',
    email_verified: true,
    name: 'John Doe',
    given_name: 'John',
    family_name: 'Doe',
    nickname: 'johndoe',
    picture: 'https://via.placeholder.com/150',
    gender: 'male',
    birthdate: '1995-05-15',
    zoneinfo: 'Asia/Ho_Chi_Minh',
    locale: 'vi-VN',
    role: 'user',
    roles: ['user'],
    permissions: ['read'],
    organization: 'ACME Corporation',
    department: 'Sales',
    updated_at: Math.floor(Date.now() / 1000),
  },
  {
    id: '3',
    username: 'demo',
    password: 'demo123',
    email: 'demo@example.com',
    email_verified: true,
    name: 'Demo User',
    given_name: 'Demo',
    family_name: 'User',
    nickname: 'demo',
    gender: 'other',
    zoneinfo: 'Asia/Ho_Chi_Minh',
    locale: 'en-US',
    role: 'user',
    roles: ['user'],
    permissions: ['read'],
    updated_at: Math.floor(Date.now() / 1000),
  },
];

/**
 * Xác thực username và password
 * @param {string} username 
 * @param {string} password 
 * @returns {Object|null} User object nếu xác thực thành công, null nếu thất bại
 */
async function authenticate(username, password) {
  // Trong thực tế:
  // 1. Query database để tìm user theo username
  // 2. So sánh password hash (bcrypt.compare)
  // 3. Kiểm tra account status (active, locked, etc.)
  
  const user = USERS_DB.find(u => u.username === username);
  
  if (!user) {
    return null;
  }
  
  // So sánh plain password (KHÔNG BAO GIỜ làm vậy trong production!)
  // Trong production: await bcrypt.compare(password, user.passwordHash)
  if (user.password !== password) {
    return null;
  }
  
  // Không trả về password ra ngoài
  const { password: _, ...userWithoutPassword } = user;
  
  return userWithoutPassword;
}

/**
 * Tìm user theo ID
 * @param {string} userId 
 * @returns {Object|null} User object hoặc null
 */
async function findById(userId) {
  const user = USERS_DB.find(u => u.id === userId);
  
  if (!user) {
    return null;
  }
  
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Tìm user theo username
 * @param {string} username 
 * @returns {Object|null} User object hoặc null
 */
async function findByUsername(username) {
  const user = USERS_DB.find(u => u.username === username);
  
  if (!user) {
    return null;
  }
  
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Tìm user theo email
 * @param {string} email 
 * @returns {Object|null} User object hoặc null
 */
async function findByEmail(email) {
  const user = USERS_DB.find(u => u.email === email);
  
  if (!user) {
    return null;
  }
  
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Tạo user mới
 * @param {Object} userData 
 * @returns {Object} Created user
 */
async function createUser(userData) {
  // Trong thực tế: hash password, validate data, save to DB
  const newUser = {
    id: String(USERS_DB.length + 1),
    ...userData,
    email_verified: false,
    updated_at: Math.floor(Date.now() / 1000),
  };
  
  USERS_DB.push(newUser);
  
  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

/**
 * Cập nhật thông tin user
 * @param {string} userId 
 * @param {Object} updates 
 * @returns {Object|null} Updated user hoặc null
 */
async function updateUser(userId, updates) {
  const index = USERS_DB.findIndex(u => u.id === userId);
  
  if (index === -1) {
    return null;
  }
  
  USERS_DB[index] = {
    ...USERS_DB[index],
    ...updates,
    updated_at: Math.floor(Date.now() / 1000),
  };
  
  const { password, ...userWithoutPassword } = USERS_DB[index];
  return userWithoutPassword;
}

/**
 * Xoá user
 * @param {string} userId 
 * @returns {boolean} true nếu xoá thành công
 */
async function deleteUser(userId) {
  const index = USERS_DB.findIndex(u => u.id === userId);
  
  if (index === -1) {
    return false;
  }
  
  USERS_DB.splice(index, 1);
  return true;
}

/**
 * Lấy danh sách tất cả users (không bao gồm password)
 * @returns {Array} Array of users
 */
async function getAllUsers() {
  return USERS_DB.map(({ password, ...user }) => user);
}

/**
 * OIDC Account class - required by oidc-provider
 */
class Account {
  constructor(id, userData) {
    this.accountId = id;
    this.userData = userData;
  }

  /**
   * Claims method - trả về claims của user
   * @param {string} use - 'id_token' hoặc 'userinfo'
   * @param {string} scope - requested scopes
   * @param {Object} claims - requested claims
   * @param {Array} rejected - rejected claims
   * @returns {Object} Claims object
   */
  async claims(use, scope, claims, rejected) {
    // Trả về toàn bộ user data, oidc-provider sẽ filter theo scope
    return {
      sub: this.accountId,
      ...this.userData,
    };
  }

  /**
   * Find account by federated login (for social login)
   */
  static async findByFederated(provider, claims) {
    // Implement federated login logic here
    return undefined;
  }

  /**
   * Find account by ID
   */
  static async findAccount(ctx, id, token) {
    const user = await findById(id);
    
    if (!user) {
      return undefined;
    }
    
    return new Account(id, user);
  }
}

module.exports = {
  authenticate,
  findById,
  findByUsername,
  findByEmail,
  createUser,
  updateUser,
  deleteUser,
  getAllUsers,
  Account,
};

