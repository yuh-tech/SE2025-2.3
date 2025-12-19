/**
 * User Service - Xác thực và quản lý người dùng (PostgreSQL + Prisma)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// Prisma client singleton
const prisma = new PrismaClient();

// Map User record từ DB sang object claims-friendly (không trả passwordHash)
function mapUser(user) {
  if (!user) return null;
  const roles = Array.isArray(user.roles) ? user.roles : [];
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    email_verified: user.emailVerified,
    name: user.name,
    given_name: user.givenName,
    family_name: user.familyName,
    nickname: user.nickname || user.username,
    picture: user.picture,
    phone_number: user.phoneNumber,
    phone_number_verified: user.phoneNumberVerified,
    roles,
    permissions,
    updated_at: Math.floor(new Date(user.updatedAt || Date.now()).getTime() / 1000),
  };
}

/**
 * Xác thực username và password
 * @param {string} username 
 * @param {string} password 
 * @returns {Object|null} User object nếu xác thực thành công, null nếu thất bại
 */
async function authenticate(username, password) {
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return null;

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;

    return mapUser(user);
  } catch (err) {
    console.error('Auth error:', err);
    return null;
  }
}

/**
 * Tìm user theo ID
 * @param {string} userId 
 * @returns {Object|null} User object hoặc null
 */
async function findById(userId) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return mapUser(user);
  } catch (err) {
    console.error('findById error:', err);
    return null;
  }
}

/**
 * Tìm user theo username
 * @param {string} username 
 * @returns {Object|null} User object hoặc null
 */
async function findByUsername(username) {
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    return mapUser(user);
  } catch (err) {
    console.error('findByUsername error:', err);
    return null;
  }
}

/**
 * Tìm user theo email
 * @param {string} email 
 * @returns {Object|null} User object hoặc null
 */
async function findByEmail(email) {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    return mapUser(user);
  } catch (err) {
    console.error('findByEmail error:', err);
    return null;
  }
}

/**
 * Tạo user mới
 * @param {Object} userData 
 * @returns {Object} Created user
 */
async function createUser(userData) {
  try {
    const { password, ...rest } = userData;
    const passwordHash = password ? await bcrypt.hash(password, 10) : '';

    const user = await prisma.user.create({
      data: {
        username: rest.username,
        passwordHash,
        email: rest.email,
        name: rest.name,
        givenName: rest.given_name || rest.givenName,
        familyName: rest.family_name || rest.familyName,
        nickname: rest.nickname || rest.username,
        picture: rest.picture,
        phoneNumber: rest.phone_number || rest.phoneNumber,
        emailVerified: !!rest.email_verified,
        phoneNumberVerified: !!rest.phone_number_verified,
        roles: rest.roles || [],
        permissions: rest.permissions || [],
      },
    });
    return mapUser(user);
  } catch (err) {
    console.error('createUser error:', err);
    throw err;
  }
}

/**
 * Cập nhật thông tin user
 * @param {string} userId 
 * @param {Object} updates 
 * @returns {Object|null} Updated user hoặc null
 */
async function updateUser(userId, updates) {
  try {
    const data = { ...updates };
    if (updates.password) {
      data.passwordHash = await bcrypt.hash(updates.password, 10);
      delete data.password;
    }
    if (updates.roles) data.roles = updates.roles;
    if (updates.permissions) data.permissions = updates.permissions;

    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });
    return mapUser(user);
  } catch (err) {
    console.error('updateUser error:', err);
    return null;
  }
}

/**
 * Xoá user
 * @param {string} userId 
 * @returns {boolean} true nếu xoá thành công
 */
async function deleteUser(userId) {
  try {
    await prisma.user.delete({ where: { id: userId } });
    return true;
  } catch (err) {
    console.error('deleteUser error:', err);
    return false;
  }
}

/**
 * Lấy danh sách tất cả users (không bao gồm password)
 * @returns {Array} Array of users
 */
async function getAllUsers() {
  const list = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  return list.map(mapUser);
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
    if (!user) return undefined;
    return new Account(id, user);
  }
}

export {
  prisma,
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

