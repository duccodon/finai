import { Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { UserService } from 'src/user/user.service';
import { SigninDto } from 'src/dtos/signin.dto';
import { SignupDto } from 'src/dtos/signup.dto';
import { User } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
  ) {}

  private refreshTtlSeconds() {
    return Number(process.env.REFRESH_TTL_DAYS || '30') * 24 * 60 * 60;
  }

  async signup(dto: SignupDto) {
    return this.userService.signup(dto);
  }

  async signin(dto: SigninDto) {
    const user = await this.userService.signin(dto);

    const accessToken = await this.tokenService.signAccess({ sub: user.id, email: user.email });
    const refreshPlain = this.tokenService.generateRefreshPlain();
    const refreshHash = this.tokenService.hashRefresh(refreshPlain);
    const ttl = this.refreshTtlSeconds();
    const jti = await this.sessionService.create(user.id, refreshHash, ttl);

    return { user, accessToken, refreshPlain, jti };
  }

  async refresh(refreshPlain: string, jti: string) {
    const stored = await this.sessionService.get(jti);
    if (!stored) throw new UnauthorizedException('Refresh Token not existed!');

    const expected = this.tokenService.hashRefresh(refreshPlain);
    if (expected !== stored.refreshHash) {
      // possible reuse -> revoke all
      await this.sessionService.revoke(jti);
      throw new UnauthorizedException('Refresh Token not existed!');
    }

    // rotate using SessionService.rotate to centralize behavior
    const newPlain = this.tokenService.generateRefreshPlain();
    const newHash = this.tokenService.hashRefresh(newPlain);
    const newJti = uuidv4();
    await this.sessionService.rotate(jti, newJti, newHash, this.refreshTtlSeconds());

    const user = (await this.userService.findById(stored.userId)) as User;
    const accessToken = await this.tokenService.signAccess({ sub: user.id, email: user.email });

    return { accessToken, refreshPlain: newPlain, jti: newJti, user };
  }
}
