/**
 * Database Utilities
 * 
 * File này cung cấp các utilities để kết nối và làm việc với database
 * Trong demo này sử dụng in-memory storage, nhưng có thể mở rộng để
 * hỗ trợ MongoDB, PostgreSQL, MySQL, etc.
 */

import { getPrisma } from './prisma.js';

/**
 * Prisma-backed Adapter cho oidc-provider.
 * Lưu toàn bộ payload (token/code/session/interaction) vào bảng OidcAdapter.
 */
class PrismaAdapter {
  constructor(name) {
    this.name = name; // kind
    this.prisma = getPrisma();
  }

  key(id) {
    return `${this.name}:${id}`;
  }

  expiresAtDate(expiresIn) {
    return expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
  }

  async upsert(id, payload, expiresIn) {
    const key = this.key(id);
    const expiresAt = this.expiresAtDate(expiresIn);
    const { grantId, userCode, uid } = payload;

    await this.prisma.oidcAdapter.upsert({
      where: { id: key },
      update: {
        payload,
        grantId,
        userCode,
        uid,
        expiresAt,
      },
      create: {
        id: key,
        kind: this.name,
        payload,
        grantId,
        userCode,
        uid,
        expiresAt,
      },
    });
  }

  async find(id) {
    const key = this.key(id);
    const record = await this.prisma.oidcAdapter.findUnique({ where: { id: key } });
    if (!record) return undefined;

    if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
      await this.prisma.oidcAdapter.delete({ where: { id: key } });
      return undefined;
    }

    return record.payload;
  }

  async findByUserCode(userCode) {
    if (!userCode) return undefined;
    const record = await this.prisma.oidcAdapter.findUnique({ where: { userCode } });
    if (!record) return undefined;

    if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
      await this.prisma.oidcAdapter.delete({ where: { id: record.id } });
      return undefined;
    }
    return record.payload;
  }

  async findByUid(uid) {
    if (!uid) return undefined;
    const record = await this.prisma.oidcAdapter.findUnique({ where: { uid } });
    if (!record) return undefined;

    if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
      await this.prisma.oidcAdapter.delete({ where: { id: record.id } });
      return undefined;
    }
    return record.payload;
  }

  async destroy(id) {
    const key = this.key(id);
    await this.prisma.oidcAdapter.deleteMany({ where: { id: key } });
  }

  async revokeByGrantId(grantId) {
    if (!grantId) return;
    await this.prisma.oidcAdapter.deleteMany({ where: { grantId } });
  }

  async consume(id) {
    const key = this.key(id);
    // Update consumed both in payload and field
    const record = await this.prisma.oidcAdapter.findUnique({ where: { id: key } });
    if (!record) return;
    const payload = { ...record.payload, consumed: Math.floor(Date.now() / 1000) };
    await this.prisma.oidcAdapter.update({
      where: { id: key },
      data: {
        payload,
        consumedAt: new Date(),
      },
    });
  }
}

/**
 * Factory function cho oidc-provider
 */
function createAdapter(name) {
  return new PrismaAdapter(name);
}

export {
  PrismaAdapter,
  createAdapter,
};

