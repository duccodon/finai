import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import bcrypt from 'node_modules/bcryptjs';
import { SigninDto } from 'src/dtos/signin.dto';
import { SignupDto } from 'src/dtos/signup.dto';
import { PrismaService } from 'src/prisma/prisma.services';

type PublicUser = Omit<User, 'password'>;

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  private toPublic(user: User): PublicUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...data } = user;
    return data;
  }

  async signup(dto: SignupDto): Promise<PublicUser> {
    const existedEmail = await this.prismaService.user.findUnique({ where: { email: dto.email } });
    if (existedEmail) throw new BadRequestException('Email already in use');

    // add user to db
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prismaService.user.create({
      data: {
        email: dto.email,
        password: hashed,
        username: dto.username,
        phone: dto.phone,
        status: 'PENDING',
      },
    });

    return this.toPublic(user);
  }

  async signin(dto: SigninDto): Promise<PublicUser> {
    const user = await this.prismaService.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('User not found!');

    const validPassword = await bcrypt.compare(dto.password, user.password);
    if (!validPassword) throw new UnauthorizedException('Wrong Password!');

    return this.toPublic(user);
  }

  async findByEmail(email: string) {
    return this.prismaService.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prismaService.user.findUnique({ where: { id } });
  }
}
