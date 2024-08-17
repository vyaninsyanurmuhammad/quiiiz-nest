import { supabaseClient } from './../supabase.client';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from 'src/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signInUserByGoogle() {
    return await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.CLIENT_URL}/auth/callback?`,
      },
    });
  }

  async validateUser(access_token: string): Promise<{
    access_token: string;
  }> {
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser(access_token);

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    let dbUser = await this.prisma.account.findUnique({
      where: {
        accountId: user.id,
      },
      include: {
        user: true,
      },
    });

    if (!dbUser) {
      const newUser = await this.prisma.user.create({
        data: {
          name: user.user_metadata.full_name,
          Account: {
            create: {
              accountId: user.id,
              email: user.email,
            },
          },
        },

        include: {
          Account: {
            include: {
              user: true,
            },
          },
        },
      });

      dbUser = newUser.Account;
    }

    const payload = {
      sub: dbUser.accountId,
      username: dbUser.user.username,
      name: dbUser.user.name,
    };

    return this.refreshToken(payload);
  }

  refreshToken(payload: { sub: string; username: string; name: string }): {
    access_token: string;
  } {
    const access_token = this.jwtService.sign(payload);

    const payloads = this.jwtService.decode(access_token);

    console.log('Refresh', new Date(payloads.exp!).toLocaleString());

    return { access_token };
  }

  async signOut() {
    await supabaseClient.auth.signOut();
  }
}
