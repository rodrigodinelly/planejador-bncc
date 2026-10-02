import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return null;
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      return null;
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas. Verifique seu e-mail e senha.');
    }

    return this.generateTokens(user);
  }

  async refresh(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Token de atualização não fornecido.');
    }

    const now = new Date();
    // Buscar tokens não revogados e não expirados
    const activeTokens = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: now },
      },
      include: { user: true },
    });

    // Comparar o hash com os tokens ativos
    let matchedTokenRecord: typeof activeTokens[0] | null = null;
    for (const record of activeTokens) {
      const match = await bcrypt.compare(rawRefreshToken, record.tokenHash);
      if (match) {
        matchedTokenRecord = record;
        break;
      }
    }

    if (!matchedTokenRecord) {
      throw new UnauthorizedException('Sessão expirada ou inválida. Faça login novamente.');
    }

    // Revogar token anterior (rotação de refresh token)
    await this.prisma.refreshToken.update({
      where: { id: matchedTokenRecord.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(matchedTokenRecord.user);
  }

  async logout(rawRefreshToken?: string) {
    if (!rawRefreshToken) {
      return { success: true };
    }

    const now = new Date();
    const activeTokens = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: now },
      },
    });

    for (const record of activeTokens) {
      const match = await bcrypt.compare(rawRefreshToken, record.tokenHash);
      if (match) {
        await this.prisma.refreshToken.update({
          where: { id: record.id },
          data: { revokedAt: new Date() },
        });
        break;
      }
    }

    return { success: true };
  }

  private async generateTokens(user: { id: string; email: string; name: string; role: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Gerar refresh token de alta entropia
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawRefreshToken, 10);

    const expirationDays = this.configService.get<number>('REFRESH_TOKEN_EXPIRATION_DAYS') || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(expirationDays));

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
