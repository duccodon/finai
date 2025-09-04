import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from 'prisma/prisma.services';

@Module({
  imports: [UserModule],
  providers: [UserService, PrismaService],
  exports: [UserService],
})
export class UserModule {}
