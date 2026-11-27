
import type sql from 'mssql/msnodesqlv8';
import type {
  AuditLogDto,
  AuditLogPageDto,
} from '../dtos/auditLogDto.ts';
import { NotFoundError } from '../errors/NotFoundError.ts';
import {
  AuditLogRepository,
  type AuditEntry,
} from '../repositories/auditLogRepository.ts';
import type { AuditLogQuery } from '../schemas/auditLogSchema.ts';
import type { AuthUser } from '../types/user.ts';

export interface AuthAuditContext {
  ipAddress: string | null;
  userAgent: string | null;
}

type AuthResult = 'success' | 'failure';

export class AuditLogService {
  constructor(
    private readonly auditLogRepository: AuditLogRepository = new AuditLogRepository(),
  ) {}

  async record(
    entry: AuditEntry,
    transaction?: sql.Transaction,
  ): Promise<void> {
    await this.auditLogRepository.insert(entry, transaction);
  }

  async recordLogin(
    user: AuthUser,
    context: AuthAuditContext,
    result: AuthResult = 'success',
  ): Promise<void> {
    try {
      await this.record({
        userId: user.id,
        action: 'LOGIN',
        targetTable: 'USERS',
        targetId: user.id,
        metadata: {
          role: user.role,
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
          result,
        },
      });
    } catch (error) {
      console.error('Audit LOGIN gagal dicatat:', error);
    }
  }

  async recordLogout(
    user: AuthUser,
    context: AuthAuditContext,
  ): Promise<void> {
    try {
      await this.record({
        userId: user.id,
        action: 'LOGOUT',
        targetTable: 'USERS',
        targetId: user.id,
        metadata: {
          role: user.role,
          ip_address: context.ipAddress,
          user_agent: context.userAgent,
          result: 'success',
        },
      });
    } catch (error) {
      console.error('Audit LOGOUT gagal dicatat:', error);
    }
  }

  async getById(id: number): Promise<AuditLogDto> {
    const auditLog = await this.auditLogRepository.findById(id);

    if (!auditLog) {
      throw new NotFoundError(
        'AUDIT_LOG_NOT_FOUND',
        'Data audit tidak ditemukan.',
      );
    }

    return auditLog;
  }

  async list(query: AuditLogQuery): Promise<AuditLogPageDto> {
    const { items, total } = await this.auditLogRepository.findPage(query);
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.pageSize);

    return {
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages,
      },
    };
  }
}
