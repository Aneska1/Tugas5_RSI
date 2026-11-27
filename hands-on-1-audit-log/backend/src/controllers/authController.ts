
import type { Request, Response } from 'express';
import { getUser } from '../middlewares/auth.ts';
import type { LoginInput, RegisterInput } from '../schemas/authSchema.ts';
import { AuthService } from '../services/authService.ts';
import { clearAuthCookie, setAuthCookie } from '../utils/cookie.ts';

export class AuthController {
  constructor(private readonly authService: AuthService = new AuthService()) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const input = req.body as RegisterInput;
    const data = await this.authService.register(input);

    // Sengaja tidak memasang cookie agar proses register dan login terpisah.
    res.status(201).json({
      status: 'success',
      message: 'Akun berhasil dibuat. Silakan masuk.',
      data,
    });
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const input = req.body as LoginInput;

    const result = await this.authService.login(input, {
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });

    setAuthCookie(res, result.token);

    res.status(200).json({
      status: 'success',
      message: 'Berhasil masuk ke MaemBolo.',
      data: result.user,
    });
  };

  me = async (req: Request, res: Response): Promise<void> => {
    const currentUser = getUser(req);
    const data = await this.authService.me(currentUser.id);

    res.status(200).json({ status: 'success', data });
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const currentUser = getUser(req);

    await this.authService.logout(currentUser, {
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });

    clearAuthCookie(res);

    res.status(200).json({
      status: 'success',
      message: 'Berhasil keluar dari MaemBolo.',
      data: { loggedOut: true },
    });
  };
}
