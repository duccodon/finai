import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenService } from './token.service';
import { SessionService } from './session/session.service';
import { UserService } from 'src/user/user.service';
import { SigninDto } from 'src/dtos/signin.dto';
import { SignupDto } from 'src/dtos/signup.dto';
import { User } from '@prisma/client';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly emailService: EmailService,
  ) {}

  private refreshTtlSeconds() {
    return Number(process.env.REFRESH_TTL_DAYS || '30') * 24 * 60 * 60;
  }

  private resetPasswordTtlSeconds() {
    const RESET_PASS_MINUTES = 15;
    return RESET_PASS_MINUTES * 60;
  }

  async signup(dto: SignupDto) {
    return this.userService.signup(dto);
  }

  async signin(dto: SigninDto) {
    const user = await this.userService.signin(dto);

    const accessToken = await this.tokenService.signJwtToken({ sub: user.id, email: user.email });
    const refreshPlain = this.tokenService.generateBase64Token();
    const refreshHash = this.tokenService.hashBase64Token(refreshPlain);
    const ttl = this.refreshTtlSeconds();
    // create session,
    const jti = await this.sessionService.create(user.id, refreshHash, ttl);

    return { user, accessToken, refreshPlain, jti };
  }

  async refresh(refreshPlain: string, jti: string) {
    const stored = await this.sessionService.get(jti);
    if (!stored) throw new UnauthorizedException('Refresh Token not existed!');

    const expected = this.tokenService.hashBase64Token(refreshPlain);
    if (expected !== stored.token) {
      // possible reuse -> revoke all
      await this.sessionService.revoke(jti);
      throw new UnauthorizedException('Refresh Token not existed!');
    }

    // rotate using SessionService.rotate to centralize behavior
    const newPlain = this.tokenService.generateBase64Token();
    const newHash = this.tokenService.hashBase64Token(newPlain);
    const newJti = await this.sessionService.rotate(jti, newHash, this.refreshTtlSeconds());

    const user = (await this.userService.findById(stored.userId)) as User;
    const accessToken = await this.tokenService.signJwtToken({ sub: user.id, email: user.email });

    return { accessToken, refreshPlain: newPlain, jti: newJti, user };
  }

  async logout(refreshPlain: string, jti: string) {
    const stored = await this.sessionService.get(jti);
    if (!stored) throw new UnauthorizedException('Refresh Token not existed!');

    const expected = this.tokenService.hashBase64Token(refreshPlain);
    if (expected !== stored.token) {
      await this.sessionService.revoke(jti);
      throw new UnauthorizedException('Refresh Token not existed!');
    }

    // revoke the session after successful validation
    await this.sessionService.revoke(jti);
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');

    const resetToken = this.tokenService.generateBase64Token();
    const hashResetToken = this.tokenService.hashBase64Token(resetToken);
    const ttl = this.resetPasswordTtlSeconds();

    const resetSessionId = await this.sessionService.createResetSession(
      user.id,
      hashResetToken,
      ttl,
    );

    // service sent email here
    await this.emailService.sendResetEmail(email, resetSessionId);

    return { message: 'Reset Password link was sent to you', resetSessionId };
  }

  async resetPassword(resetSessionId: string, newPassword: string) {
    const data = await this.sessionService.getResetToken(resetSessionId);
    if (!data) throw new BadRequestException('Invalid or expire reset password session');

    await this.userService.updatePassword(data.userId, newPassword);
    await this.sessionService.deleteResetToken(resetSessionId);

    return { message: 'Password reset successfully' };
  }
}
