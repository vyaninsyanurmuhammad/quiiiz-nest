import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { supabaseClient } from 'src/supabase.client';
import { PrismaService } from 'src/prisma.service';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    let dbUser = await this.prisma.account.findUnique({
      where: {
        accountId: payload.sub,
      },
      include: {
        user: true,
      },
    });

    if (!dbUser) {
      throw new UnauthorizedException('User Not Exist');
    }

    const user = {
      sub: dbUser.accountId,
      username: dbUser.user.username,
      name: dbUser.user.name,
    };

    const jwt = this.authService.refreshToken(user);

    return { user, jwt };
  }
}
