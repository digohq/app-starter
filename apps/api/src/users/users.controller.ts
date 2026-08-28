import {
  Controller,
  Get,
  Put,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Param,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/email-verified.guard';
import { UsersService } from './users.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { PublicUserDto } from './dto/public-user.dto';
import { TokenPayload } from '@app-starter/shared';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserProfile(@Request() req: { user: TokenPayload }): Promise<UserProfileResponseDto> {
    const userId = req.user.sub;
    return this.usersService.getUserProfile(userId);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard, ThrottlerGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @HttpCode(HttpStatus.OK)
  async updateUserProfile(
    @Request() req: { user: TokenPayload },
    @Body() updateDto: UpdateUserProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UserProfileResponseDto> {
    const userId = req.user.sub;
    return this.usersService.updateUserProfile(userId, updateDto, file);
  }

  @Get('username/:username')
  @HttpCode(HttpStatus.OK)
  async getUserByUsername(@Param('username') username: string): Promise<PublicUserDto> {
    return this.usersService.findByUsername(username);
  }

  @Get(':id/public')
  @HttpCode(HttpStatus.OK)
  async getPublicProfile(@Param('id') id: string): Promise<PublicUserDto> {
    return this.usersService.getPublicProfile(id);
  }
}
