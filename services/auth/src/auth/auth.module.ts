import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.services';
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { EmailService } from './services/email.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    UserService,
    JwtService,
    PrismaService,
    TokenService,
    SessionService,
    EmailService,
  ],
})
export class AuthModule {}
