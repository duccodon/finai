import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from 'prisma/prisma.services';

@Module({
  providers: [UserService, PrismaService],
})
export class UserModule {}
