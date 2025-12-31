import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  Req,
  Param,
  Patch,
  Delete,
  UseGuards,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import {
  SignupDto,
  LoginDto,
  LoginWithPhoneDto,
  GoogleSigninDto,
} from './dto/auth.dto';
import { CreateSubAdminDto } from './dto/create-sub-admin.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpToNumberDto } from './dto/verify-otp-number';
import { ResendOtpToNumberDto } from './dto/resend-otp-number';
import { JwtAuthGuard } from './guard/jwt/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './entity/users.entity';
import { Request } from '@nestjs/common';
import { VerifyOtpForgotDto } from './dto/verify-otp-forgot';
import { UsersQueryDto } from './dto/user-query.dto';
import { UserRole } from './enums/enum';
import { Roles } from './guard/role/roles.decorator';
import { ApiResponse } from '../../common/utils/response.util';
import { SellerTypeStatusDto } from './dto/seller-paused.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @UseInterceptors(FileInterceptor('profileImage'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'User signup with optional profile image and files array (seller only)',
  })
  @SwaggerResponse({ status: 201, description: 'User registered successfully' })
  async signup(
    @Body() dto: SignupDto,
    @UploadedFile() profileImage?: Express.Multer.File,
  ) {
    return this.authService.signup(dto, profileImage);
  }

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @SwaggerResponse({ status: 200, description: 'Login successful' })
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    return this.authService.login(user);
  }

  @Post('login-phone')
  @ApiOperation({ summary: 'User login with phone' })
  @SwaggerResponse({ status: 200, description: 'Login successful' })
  async loginWithPhone(@Body() dto: LoginWithPhoneDto) {
    const user = await this.authService.validateUserByPhone(
      dto.phone,
      dto.password,
    );
    return this.authService.login(user);
  }

  @Post('google-signin')
  @ApiOperation({ summary: 'Google Sign-in with ID token' })
  @SwaggerResponse({
    status: 200,
    description: 'Google sign-in successful - existing user',
  })
  @SwaggerResponse({
    status: 201,
    description: 'Google sign-in successful - new user created',
  })
  @SwaggerResponse({ status: 400, description: 'Invalid Google ID token' })
  async googleSignin(@Body() dto: GoogleSigninDto) {
    return this.authService.googleSignin(dto.idToken);
  }

  @Post('resend-otp-to-mail')
  @ApiOperation({ summary: 'Resend OTP to user email' })
  @SwaggerResponse({ status: 200, description: 'OTP resent successfully' })
  async resendOtpToMail(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtpToMail(dto.email);
  }

  @Post('verify-otp-to-mail')
  @ApiOperation({ summary: 'verify OTP to user email' })
  @SwaggerResponse({ status: 200, description: 'OTP verify successfully' })
  async verifyOtpToMail(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtpToMail(dto.email, dto.otp);
  }

  @Post('resend-otp-to-number')
  @ApiOperation({ summary: 'Resend OTP to user phone number' })
  @SwaggerResponse({ status: 200, description: 'OTP resent successfully' })
  async resendOtpToNumber(@Body() dto: ResendOtpToNumberDto) {
    return this.authService.resendOtpToNumber(dto.phone);
  }

  @Post('verify-otp-to-number')
  @ApiOperation({ summary: 'Verify OTP from phone number' })
  @SwaggerResponse({ status: 200, description: 'OTP verified successfully' })
  async verifyOtpToNumber(@Body() dto: VerifyOtpToNumberDto) {
    return this.authService.verifyOtpToNumber(dto.phone, dto.otp);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password using old password' })
  @SwaggerResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  async changePassword(
    @Req() req: ExpressRequest & { user: { userId: string } },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      req.user.userId,
      dto.oldPassword,
      dto.newPassword,
    );
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request OTP for password reset' })
  @SwaggerResponse({ status: 200, description: 'OTP sent to user email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('verify-otp-to-email-forgot-pass')
  @ApiOperation({ summary: 'Verify OTP from email' })
  @SwaggerResponse({ status: 200, description: 'OTP verified successfully' })
  async verifyOtpForgotPassword(@Body() dto: VerifyOtpForgotDto) {
    return this.authService.verifyOtpForgot(dto.email, dto.otp);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Verify OTP and reset password (forgot password flow)',
  })
  @SwaggerResponse({ status: 200, description: 'Password reset successfully' })
  async verifyOtpAndResetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.otp, dto.newPassword);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('profileImage'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'User update profile with optional profile image' })
  @SwaggerResponse({
    status: 201,
    description: 'User profile updated successfully',
  })
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() profileImage?: Express.Multer.File,
  ) {
    return this.authService.updateProfile(id, dto, profileImage);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users with pagination' })
  @SwaggerResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAllUsers(@Query() query: UsersQueryDto) {
    try {
      const users = await this.authService.findAll(query);
      return ApiResponse.success(users, 'Users retrieved successfully');
    } catch (error) {
      return ApiResponse.error(
        'Failed to retrieve users: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  }

  @Get('users/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile from token' })
  @SwaggerResponse({ status: 200, description: 'User retrieved successfully' })
  async findUserById(
    @Req()
    req: ExpressRequest & {
      user: { id: string; userId?: string; UserId?: string; role: string };
    },
  ) {
    try {
      const userId = req.user.id || req.user.userId || req.user.UserId;
      if (!userId) {
        throw new UnauthorizedException('User ID not found in token');
      }
      const user = await this.authService.findUserById(userId);
      return ApiResponse.success(user, 'User retrieved successfully');
    } catch (error) {
      return ApiResponse.error(
        'Failed to retrieve user: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user (admin or self)' })
  @SwaggerResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(
    @Param('id') id: string,
    @Req()
    req: ExpressRequest & {
      user: { userId: string; UserId?: string; role: string };
    },
  ) {
    const userId: string = req.user.UserId || req.user.userId;
    const role: UserRole = req.user.role as UserRole;

    return this.authService.deleteUser(userId, id, role);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Patch('seller/update-availability/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpause or paused seller account' })
  async sellerPaused(
    @Param('id') id: string,
    @Body() dto: SellerTypeStatusDto,
    @Req() req: Request & { user: User },
  ) {
    const userId = req.user.id;
    return await this.authService.updateUnpausedAndPaused(
      id,
      dto.status,
      userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout the currently logged-in user' })
  @SwaggerResponse({ status: 200, description: 'User logged out successfully' })
  async logout(@Req() req) {
    return this.authService.logout(req.user.id);
  }

  @Post('create-sub-admin')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('profileImage'))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Create sub admin (Super admin only) - Role is automatically set to ADMIN',
  })
  @SwaggerResponse({
    status: 201,
    description: 'Sub admin created successfully',
  })
  @SwaggerResponse({
    status: 403,
    description: 'Only super admins can create sub admins',
  })
  async createSubAdmin(
    @Body() dto: CreateSubAdminDto,
    @Req() req: ExpressRequest & { user: User },
    @UploadedFile() profileImage?: Express.Multer.File,
  ) {
    const superAdminId = (req.user as any).id || req.user.id;
    return this.authService.createSubAdmin(dto, superAdminId, profileImage);
  }
}
