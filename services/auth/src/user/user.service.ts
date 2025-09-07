import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SigninDto } from 'src/dtos/signin.dto';
import { SignupDto } from 'src/dtos/signup.dto';
import { PrismaService } from 'prisma/prisma.services';
import { UpdateUserDto } from 'src/dtos/update-user.dto';

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
        firstName: dto.firstName,
        lastName: dto.lastName,
        // convert ISO dob string to Date (Prisma DateTime)
        dob: dto.dob ? new Date(dto.dob) : undefined,
        location: dto.location,
        company: dto.company,
        street: dto.street,
        city: dto.city,
        state: dto.state,
        about: dto.about,
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

  async updatePassword(userId: string, newPassword: string): Promise<PublicUser> {
    const user = await this.prismaService.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await this.prismaService.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return this.toPublic(updatedUser);
  }

  async getMe(userId: string) {
    const user = await this.prismaService.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found!');

    return this.toPublic(user);
  }

  /**
   * Update partial user fields.
   * dto may contain: username, email, password, phone, firstName, lastName,
   * dob (ISO string), location, company, street, city, state, about, avatarUrl
   */
  async update(userId: string, dto: UpdateUserDto): Promise<PublicUser> {
    const exists = await this.prismaService.user.findUnique({ where: { id: userId } });
    if (!exists) throw new BadRequestException('User not found');

    // allowed simple fields (dob & password handled specially below)
    const simpleFields = [
      'username',
      'email',
      'phone',
      'firstName',
      'lastName',
      'location',
      'company',
      'street',
      'city',
      'state',
      'about',
      'avatarUrl',
    ] as const;

    const data: Record<string, unknown> = {};
    const payload = dto as Record<string, unknown>;

    console.log('dto >>>', dto);

    // apply only keys that are PRESENT in the incoming DTO (undefined => not provided => keep old value)
    for (const key of simpleFields) {
      // hasOwnProperty returns boolean; check truthiness to detect presence
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const val = payload[key];
        // allow null/empty string to overwrite existing value (if client explicitly sends it)
        if (typeof val !== 'undefined') data[key] = val;
      }
    }

    // dob: if present in DTO, allow clearing (null/empty) or set Date
    // dob
    if (payload.dob !== undefined) {
      const rawDob = payload['dob'];
      if (rawDob === null || rawDob === '') {
        data.dob = null;
      } else if (typeof rawDob === 'string') {
        data.dob = new Date(rawDob);
      } else if ((rawDob as any) instanceof Date) {
        data.dob = rawDob;
      }
    }

    // password: chỉ vào nhánh khi newPass là string (được gửi thật sự)
    const newPass = payload['password'];
    if (typeof newPass === 'string') {
      const oldPass = payload['oldPassword'];
      if (!oldPass || typeof oldPass !== 'string') {
        throw new BadRequestException('Old password is required to change password');
      }
      if (newPass.length < 6) {
        throw new BadRequestException('Password must be at least 6 characters');
      }
      const match = await bcrypt.compare(oldPass, exists.password);
      if (!match) {
        throw new BadRequestException('Old password is incorrect');
      }
      data.password = await bcrypt.hash(newPass, 10);
    }

    // If email is being changed, ensure uniqueness
    if (typeof data.email !== 'undefined' && data.email !== exists.email) {
      const conflict = await this.prismaService.user.findUnique({
        where: { email: data.email as string },
      });
      if (conflict) throw new BadRequestException('Email already in use');
    }

    // Nothing to update -> return current public user
    if (Object.keys(data).length === 0) {
      return this.toPublic(exists);
    }

    const updated = await this.prismaService.user.update({
      where: { id: userId },
      data,
    });

    return this.toPublic(updated);
  }
}
