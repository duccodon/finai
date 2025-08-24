import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.services';
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, UserService, JwtService, PrismaService, TokenService, SessionService],
})
export class AuthModule {}
