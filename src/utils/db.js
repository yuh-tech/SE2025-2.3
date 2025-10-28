/**
 * Database Utilities
 * 
 * File này cung cấp các utilities để kết nối và làm việc với database
 * Trong demo này sử dụng in-memory storage, nhưng có thể mở rộng để
 * hỗ trợ MongoDB, PostgreSQL, MySQL, etc.
 */

/**
 * In-Memory Adapter cho OIDC Provider
 * 
 * Adapter này lưu trữ OAuth tokens, authorization codes, sessions, etc.
 * trong bộ nhớ. Trong production, nên sử dụng Redis hoặc database.
 */
class MemoryAdapter {
  constructor(name) {
    this.name = name;
    this.storage = new Map();
  }

  key(id) {
    return `${this.name}:${id}`;
  }

  async upsert(id, payload, expiresIn) {
    const key = this.key(id);
    
    const { grantId, userCode } = payload;
    
    const expiresAt = expiresIn ? Date.now() + (expiresIn * 1000) : undefined;
    
    this.storage.set(key, { 
      payload, 
      expiresAt,
      grantId,
      userCode,
    });
    
    // Index by grantId
    if (grantId) {
      const grantKey = `grant:${grantId}`;
      const grantIds = this.storage.get(grantKey) || [];
      grantIds.push(key);
      this.storage.set(grantKey, grantIds);
    }
    
    // Index by userCode
    if (userCode) {
      this.storage.set(`userCode:${userCode}`, key);
    }
  }

  async find(id) {
    const key = this.key(id);
    const data = this.storage.get(key);
    
    if (!data) {
      return undefined;
    }
    
    // Check expiration
    if (data.expiresAt && data.expiresAt < Date.now()) {
      this.storage.delete(key);
      return undefined;
    }
    
    return data.payload;
  }

  async findByUserCode(userCode) {
    const key = this.storage.get(`userCode:${userCode}`);
    
    if (!key) {
      return undefined;
    }
    
    const data = this.storage.get(key);
    
    if (!data) {
      return undefined;
    }
    
    // Check expiration
    if (data.expiresAt && data.expiresAt < Date.now()) {
      this.storage.delete(key);
      return undefined;
    }
    
    return data.payload;
  }

  async findByUid(uid) {
    for (const [key, data] of this.storage.entries()) {
      if (key.startsWith(this.name) && data.payload?.uid === uid) {
        // Check expiration
        if (data.expiresAt && data.expiresAt < Date.now()) {
          this.storage.delete(key);
          continue;
        }
        return data.payload;
      }
    }
    return undefined;
  }

  async destroy(id) {
    const key = this.key(id);
    const data = this.storage.get(key);
    
    if (data) {
      // Remove from grant index
      if (data.grantId) {
        const grantKey = `grant:${data.grantId}`;
        const grantIds = this.storage.get(grantKey) || [];
        const filtered = grantIds.filter(k => k !== key);
        if (filtered.length) {
          this.storage.set(grantKey, filtered);
        } else {
          this.storage.delete(grantKey);
        }
      }
      
      // Remove from userCode index
      if (data.userCode) {
        this.storage.delete(`userCode:${data.userCode}`);
      }
    }
    
    this.storage.delete(key);
  }

  async revokeByGrantId(grantId) {
    const grantKey = `grant:${grantId}`;
    const grantIds = this.storage.get(grantKey) || [];
    
    for (const key of grantIds) {
      const data = this.storage.get(key);
      
      if (data?.userCode) {
        this.storage.delete(`userCode:${data.userCode}`);
      }
      
      this.storage.delete(key);
    }
    
    this.storage.delete(grantKey);
  }

  async consume(id) {
    const key = this.key(id);
    const data = this.storage.get(key);
    
    if (!data) {
      return;
    }
    
    data.payload.consumed = Math.floor(Date.now() / 1000);
    this.storage.set(key, data);
  }
}

/**
 * Factory function to create adapter instances
 */
function createAdapter(name) {
  return new MemoryAdapter(name);
}

/**
 * Database connection (for future use with real database)
 */
class Database {
  constructor() {
    this.connected = false;
    this.client = null;
  }

  async connect(connectionString) {
    // Implement database connection logic here
    // Example for MongoDB:
    // const { MongoClient } = require('mongodb');
    // this.client = await MongoClient.connect(connectionString);
    // this.connected = true;
    
    console.log('Database connection not implemented (using in-memory storage)');
    this.connected = true;
  }

  async disconnect() {
    if (this.client) {
      // await this.client.close();
      this.connected = false;
    }
  }

  isConnected() {
    return this.connected;
  }
}

const db = new Database();

export {
  MemoryAdapter,
  createAdapter,
  db,
};

