import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
  NotFoundException,
  Body,
  Put,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserService } from './user.service';
import { UpdateUserDto } from 'src/dtos/update-user.dto';

@Controller('api/user/v1')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * GET /api/user/v1/me?userId=<id>
   * - reads userId from query string (frontend will pass it)
   * - returns public user payload or 404 if not found
   */
  @HttpCode(HttpStatus.OK)
  @Get('me')
  async getMe(@Req() req: Request) {
    const raw = req.query.userId;

    console.log('userId >>>', req);

    // normalize userId from query (support ?userId=... only)
    const userId = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;

    if (!userId) {
      throw new BadRequestException('userId query parameter is required');
    }

    const user = await this.userService.findById(userId as string);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * PUT /api/user/v1/me?userId=<id>
   * - frontend must pass userId as query param
   * - body: partial user fields to update (no confirmPassword expected)
   */
  @HttpCode(HttpStatus.OK)
  @Put('')
  async updateMe(@Req() req: Request, @Body() dto: UpdateUserDto) {
    const raw = req.query.userId;
    const userId = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;

    if (!userId) {
      throw new BadRequestException('userId query parameter is required');
    }

    const updated = await this.userService.update(userId as string, dto);

    if (!updated) {
      throw new NotFoundException('User not found');
    }

    return updated;
  }
}
