import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('login')
  @ApiOperation({ summary: 'Redirect to Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirect to Google OAuth' })
  @ApiResponse({ status: 400, description: 'Failed to login with Google' })
  async login(@Res() res: Response) {
    const { data, error } = await this.authService.signInUserByGoogle();

    if (error) {
      throw new HttpException(
        'Failed to login with Google',
        HttpStatus.BAD_REQUEST,
      );
    }

    return res.json({ redirectUrl: data.url });
  }

  @Get('callback')
  @ApiOperation({ summary: 'Handle OAuth callback' })
  @ApiResponse({
    status: 200,
    description: 'User authenticated and redirected',
  })
  @ApiResponse({ status: 400, description: 'Invalid token' })
  async callback(
    @Query('access_token') access_token: string,
    @Query('refresh_token') refresh_token: string,
    @Res() res: Response,
  ) {
    if (!access_token) {
      throw new HttpException(
        'No access token found in the callback',
        HttpStatus.BAD_REQUEST,
      );
    }

    const jwt = await this.authService.validateUser(access_token);

    // Redirect to your frontend application with JWT
    return res.json({ ...jwt });
  }

  @UseGuards(JwtAuthGuard)
  @Get('logout')
  async logout(@Res() res: Response) {
    await this.authService.signOut();

    return res.json({ message: 'success sign out' });
  }

  @UseGuards(JwtAuthGuard)
  @Get('refresh-token')
  async refreshToken(@Req() req, @Res() res: Response) {
    return res.json({ ...req.user.jwt });
  }
}
