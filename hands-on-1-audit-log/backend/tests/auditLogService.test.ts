
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AuditLogService } from '../src/services/auditLogService.ts';
import type { AuditLogRepository } from '../src/repositories/auditLogRepository.ts';
import type { AuthUser } from '../src/types/user.ts';

test('logout tetap berhasil ketika penyimpanan audit gagal', async () => {
  let insertAttempted = false;

  const failingRepository = {
    insert: async () => {
      insertAttempted = true;
      throw new Error('Simulasi kegagalan database audit.');
    },
  } as unknown as AuditLogRepository;

  const auditLogService = new AuditLogService(failingRepository);

  const user: AuthUser = {
    id: 1,
    name: 'Admin Pengujian',
    email: 'admin@kantin.test',
    role: 'admin',
  };

  const context = {
    ipAddress: '127.0.0.1',
    userAgent: 'node-test',
  };

  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    await assert.doesNotReject(
      auditLogService.recordLogout(user, context),
      'Logout tidak boleh gagal hanya karena audit gagal disimpan.',
    );

    assert.equal(insertAttempted, true);
  } finally {
    console.error = originalConsoleError;
  }
});
