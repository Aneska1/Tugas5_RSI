
import bcrypt from 'bcryptjs';
import { env } from '../config/env.ts';
import type { AuthUserDto } from '../dtos/authDto.ts';
import { ConflictError } from '../errors/ConflictError.ts';
import { UnauthorizedError } from '../errors/UnauthorizedError.ts';
import { UserRepository, type UserRow } from '../repositories/userRepository.ts';
import type { LoginInput, RegisterInput } from '../schemas/authSchema.ts';
import {
  AuditLogService,
  type AuthAuditContext,
} from './auditLogService.ts';
import { signToken } from './tokenService.ts';

function isUniqueViolation(error: unknown): boolean {
  const dbError = error as { number?: number };
  return dbError.number === 2627 || dbError.number === 2601;
}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository = new UserRepository(),
    private readonly auditLogService: AuditLogService = new AuditLogService(),
  ) {}

  private toDto(row: UserRow): AuthUserDto {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
    };
  }

  async login(
    input: LoginInput,
    context: AuthAuditContext,
  ): Promise<{ user: AuthUserDto; token: string }> {
    const row = await this.userRepository.findByEmail(input.email);

    // Email tidak dikenal tidak dicatat karena user_id wajib NOT NULL.
    if (!row) {
      throw new UnauthorizedError('Email atau password tidak sesuai.');
    }

    let passwordValid = false;

    try {
      passwordValid = await bcrypt.compare(input.password, row.passwordHash);
    } catch {
      passwordValid = false;
    }

    if (!passwordValid) {
      await this.auditLogService.recordLogin(
        this.toDto(row),
        context,
        'failure',
      );

      throw new UnauthorizedError('Email atau password tidak sesuai.');
    }

    const user = this.toDto(row);
    const token = signToken(user);

    await this.auditLogService.recordLogin(user, context, 'success');

    return { user, token };
  }

  async register(input: RegisterInput): Promise<AuthUserDto> {
    const existing = await this.userRepository.findByEmail(input.email);

    if (existing) {
      throw new ConflictError(
        'EMAIL_TAKEN',
        'Email sudah terdaftar. Silakan masuk atau gunakan email lain.',
        [{ field: 'email', message: 'Email ini sudah dipakai akun lain.' }],
      );
    }

    const passwordHash = await bcrypt.hash(
      input.password,
      env.bcryptSaltRounds,
    );

    try {
      const created = await this.userRepository.createCustomer({
        name: input.name,
        email: input.email,
        passwordHash,
      });

      if (!created) {
        throw new Error('User baru tidak dapat dibaca kembali setelah dibuat.');
      }

      return this.toDto(created);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          'EMAIL_TAKEN',
          'Email sudah terdaftar. Silakan masuk atau gunakan email lain.',
          [{ field: 'email', message: 'Email ini sudah dipakai akun lain.' }],
        );
      }

      throw error;
    }
  }

  async me(userId: number): Promise<AuthUserDto> {
    const row = await this.userRepository.findById(userId);

    if (!row) {
      throw new UnauthorizedError('Sesi login tidak valid.');
    }

    return this.toDto(row);
  }

  async logout(
    user: AuthUserDto,
    context: AuthAuditContext,
  ): Promise<void> {
    await this.auditLogService.recordLogout(user, context);
  }
}
