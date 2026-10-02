import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getCookieOptions() {
    const isSecure = this.configService.get<string>('COOKIE_SECURE') === 'true';
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/auth',
      secure: isSecure,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    };
  }

  private verifyCsrfHeader(req: Request) {
    const requestedWith = req.headers['x-requested-with'];
    if (!requestedWith || requestedWith !== 'XMLHttpRequest') {
      throw new ForbiddenException('Requisição inválida. Cabeçalho CSRF ausente ou incorreto.');
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    res.cookie('refreshToken', result.refreshToken, this.getCookieOptions());

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.verifyCsrfHeader(req);
    const rawRefreshToken = req.cookies?.refreshToken;
    const result = await this.authService.refresh(rawRefreshToken);
    res.cookie('refreshToken', result.refreshToken, this.getCookieOptions());

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.verifyCsrfHeader(req);
    const rawRefreshToken = req.cookies?.refreshToken;
    await this.authService.logout(rawRefreshToken);

    const isSecure = this.configService.get<string>('COOKIE_SECURE') === 'true';
    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/auth',
      secure: isSecure,
    });

    return {
      success: true,
      message: 'Sessão encerrada com sucesso.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: any) {
    return user;
  }
}
