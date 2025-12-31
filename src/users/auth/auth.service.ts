import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  HttpStatus,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
  ForbiddenException,
} from '@nestjs/common';
import { Repository, ILike } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entity/users.entity';
import { UserRole } from './enums/enum';
import { UserStatus } from './enums/status-enum';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiResponse } from '../../common/utils/response.util';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import { CommonService } from '../../common/common.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SignupDto } from './dto/auth.dto';
import { SellerFile } from './entity/seller-file.entity';
import { Seller } from 'src/seller/entities/seller.entity';
import { SellerAccountStatus } from './enums/seller-account-status.enum';
import { NotificationService } from 'src/notification/notification.service';
import { CreateNotificationDto } from 'src/notification/dto/create-notification.dto';
import { GigFavourite } from '../../gigs/entities/gig-favourite.entity';
import { UsersQueryDto } from './dto/user-query.dto';
import { Booking } from '../../bookings/entities/booking.entity';
import { Gig } from '../../gigs/entities/gig.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,

    @InjectRepository(Seller)
    private sellerRepository: Repository<Seller>,
    @InjectRepository(SellerFile)
    private sellerFileRepo: Repository<SellerFile>,
    @InjectRepository(GigFavourite)
    private readonly gigFavouriteRepository: Repository<GigFavourite>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Gig)
    private readonly gigRepository: Repository<Gig>,
    private cloudinaryService: CloudinaryService,
    private jwtService: JwtService,
    private readonly notificationService: NotificationService,

    @Inject(forwardRef(() => CommonService))
    private readonly commonService: CommonService,
  ) {}

  async signup(dto: SignupDto, profileImage?: Express.Multer.File) {
    const { name, email, phone, password, role } = dto;
    {
      if (role === UserRole.ADMIN) {
        throw new BadRequestException(
          'Sub admin cannot be created through signup. Only super admin can create sub admins.',
        );
      }

      const existingEmail = await this.usersRepo.findOne({ where: { email } });
      if (existingEmail) {
        throw new BadRequestException('Email already registered');
      }

      const existingPhone = await this.usersRepo.findOne({ where: { phone } });
      if (existingPhone) {
        throw new BadRequestException('Phone number already/" registered');
      }
      try {
        const hashed = await bcrypt.hash(password, 10);

        let profileImageUrl: string | undefined = undefined;
        if (profileImage) {
          const uploadResult =
            await this.cloudinaryService.uploadImage(profileImage);
          if ('secure_url' in uploadResult) {
            profileImageUrl = (uploadResult as { secure_url: string })
              .secure_url;
          }
        }
        const otp = this.commonService.generateOtp();

        const user = this.usersRepo.create({
          name,
          email,
          phone,
          password: hashed,
          otp,
          role: role || UserRole.BUYER,
          city: dto.city,
          country: dto.country,
          address: dto.address,
          state: dto.state,
          postalCode: dto.postalCode,
          ...(profileImageUrl && { profileImage: profileImageUrl }),
          verificationType: 'gmail',
          isActive: false,
          status: UserStatus.INACTIVE,
        });

        const savedUser = await this.usersRepo.save(user);

        if (role === UserRole.SELLER) {
          await this.sellerRepository.save({
            user: savedUser,
          });
        }

        if (role === UserRole.SELLER && dto.files && dto.files.length > 0) {
          await this.handleSellerFiles(savedUser.id, dto.files);
        }

        await this.commonService.sendOtpToMail(email, otp);

        const users = await this.usersRepo.findOne({
          where: { id: savedUser.id },
          relations: ['gigs'],
        });

        return ApiResponse.success(
          {
            id: users!.id,
            name: users!.name,
            email: users!.email,
            phone: users!.phone,
            role: users!.role,
            profileImage: users!.profileImage,
            verificationType: users!.verificationType,
            createdAt: users!.createdAt,
            gigs:
              users!.role === UserRole.SELLER
                ? users!.gigs.map((g) => ({
                    id: g.id,
                    title: g.title,
                  }))
                : [],
          },

          'User registered successfully',
          HttpStatus.CREATED,
        );
      } catch (error) {
        console.log(error);
        if (
          error instanceof BadRequestException ||
          error instanceof ConflictException ||
          error instanceof ForbiddenException ||
          error instanceof NotFoundException
        ) {
          throw error;
        }
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        throw new InternalServerErrorException(
          `Signup failed: ${errorMessage}`,
        );
      }
    }
  }

  async createSubAdmin(
    dto: any,
    superAdminId: string,
    profileImage?: Express.Multer.File,
  ) {
    const superAdmin = await this.usersRepo.findOne({
      where: { id: superAdminId, role: UserRole.SUPER_ADMIN },
    });

    if (!superAdmin) {
      throw new ForbiddenException('Only super admins can create sub admins');
    }

    const { name, email, phone, password } = dto;

    const existingEmail = await this.usersRepo.findOne({ where: { email } });
    if (existingEmail) {
      throw new BadRequestException('Email already registered');
    }

    const existingPhone = await this.usersRepo.findOne({ where: { phone } });
    if (existingPhone) {
      throw new BadRequestException('Phone number already registered');
    }

    try {
      const hashed = await bcrypt.hash(password, 10);

      let profileImageUrl: string | undefined = undefined;
      if (profileImage) {
        const uploadResult =
          await this.cloudinaryService.uploadImage(profileImage);
        if ('secure_url' in uploadResult) {
          profileImageUrl = (uploadResult as { secure_url: string }).secure_url;
        }
      }
      const otp = this.commonService.generateOtp();

      const user = this.usersRepo.create({
        name,
        email,
        phone,
        password: hashed,
        otp,
        role: UserRole.ADMIN,
        city: dto.city,
        country: dto.country,
        address: dto.address,
        state: dto.state,
        postalCode: dto.postalCode,
        ...(profileImageUrl && { profileImage: profileImageUrl }),
        verificationType: 'gmail',
        isActive: false,
        status: UserStatus.INACTIVE,
      });

      const savedUser = await this.usersRepo.save(user);

      await this.commonService.sendOtpToMail(email, otp);

      const users = await this.usersRepo.findOne({
        where: { id: savedUser.id },
      });

      return ApiResponse.success(
        {
          id: users!.id,
          name: users!.name,
          email: users!.email,
          phone: users!.phone,
          role: users!.role,
          profileImage: users!.profileImage,
          verificationType: users!.verificationType,
          createdAt: users!.createdAt,
        },
        'Sub admin created successfully',
        HttpStatus.CREATED,
      );
    } catch (error) {
      throw new InternalServerErrorException('Failed to create sub admin');
    }
  }

  async validateUser(email: string, password: string): Promise<User> {
    try {
      const user = await this.usersRepo.findOne({
        where: { email },
        select: ['id', 'name', 'email', 'password', 'role', 'isActive'],
      });

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Please verify your OTP first.');
      }

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Login failed');
    }
  }

  async validateUserByPhone(phone: string, password: string): Promise<User> {
    try {
      const user = await this.usersRepo.findOne({
        where: { phone },
        select: [
          'id',
          'name',
          'email',
          'phone',
          'password',
          'role',
          'isActive',
        ],
      });

      if (!user) {
        throw new UnauthorizedException('Invalid phone or password');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid phone or password');
      }

      if (!user.isActive) {
        throw new UnauthorizedException(
          'Pehle OTP verify karein. Please verify your OTP first.',
        );
      }

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Login failed');
    }
  }

  async resendOtpToMail(email: string): Promise<string> {
    const user = await this.usersRepo.findOneBy({ email });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      user.verificationType = 'email';
    }

    try {
      const otp = this.commonService.generateOtp();
      await this.usersRepo.update(user.id, {
        otp,
        verificationType: user.verificationType,
      });
      await this.commonService.sendOtpToMail(email, otp);

      return 'Otp sent to your email';
    } catch {
      throw new InternalServerErrorException('Failed To Resend Otp');
    }
  }

  async verifyOtpToMail(email: string, otp: number) {
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('Email not found');
    }

    if (user.isActive) {
      throw new ConflictException('User Already Activated');
    }

    if (user.otp !== otp) {
      throw new BadRequestException('Invalid Otp');
    }

    try {
      await this.usersRepo.update(user.id, {
        isActive: true,
        otp: null,
        status: UserStatus.ACTIVE,
      });

      const jwtPayload = { sub: user.id, role: user.role, email: user.email };
      const access_token = this.jwtService.sign(jwtPayload);
      return ApiResponse.success(
        {
          access_token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
        'Login successful',
        HttpStatus.OK,
      );
    } catch {
      throw new InternalServerErrorException('Email Verification Failed');
    }
  }

  async resendOtpToNumber(phone: string) {
    const user = await this.usersRepo.findOne({ where: { phone } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isActive) {
      throw new ConflictException('User Already Activated');
    }

    try {
      const otp = this.commonService.generateOtp();
      await this.usersRepo.update(user.id, { otp });
      await this.commonService.sendOtpToPhone(phone, otp);

      return 'Otp sent to your phone';
    } catch {
      throw new InternalServerErrorException('Failed To Resend Otp');
    }
  }

  async verifyOtpToNumber(phone: string, otp: number) {
    const user = await this.usersRepo.findOne({ where: { phone, otp } });
    if (!user) {
      throw new NotFoundException('phone number and otp not found');
    }

    user.isActive = true;
    user.otp = null;
    user.status = UserStatus.ACTIVE;
    try {
      await this.usersRepo.save(user);

      const jwtPayload = { sub: user.id, role: user.role, email: user.email };
      const access_token = this.jwtService.sign(jwtPayload);
      return ApiResponse.success(
        {
          access_token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
        'Login successful',
        HttpStatus.OK,
      );
    } catch {
      throw new InternalServerErrorException('phone Verification Failed');
    }
  }

  async forgotPassword(email: string) {
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('Email not found');
    }
    try {
      const otp = this.commonService.generateOtp();
      if (!user.isActive) {
        user.verificationType = 'email';
      }

      user.otp = otp;
      await this.usersRepo.save(user);
      await this.commonService.sendOtpToMail(email, otp);
      return 'Otp send to your phone';
    } catch {
      throw new InternalServerErrorException('Failed To send Otp');
    }
  }

  async verifyOtpForgot(email: string, otp: number) {
    const user = await this.usersRepo.findOne({ where: { email, otp } });

    if (!user) {
      throw new BadRequestException('Invalid OTP or Email');
    }

    return 'OTP verified successfully';
  }

  async resetPassword(email: string, otp: number, newPassword: string) {
    const user = await this.usersRepo.findOne({ where: { email, otp } });

    if (!user) {
      throw new BadRequestException('Invalid OTP or email');
    }
    try {
      const hashed = await bcrypt.hash(newPassword, 10);
      user.password = hashed;
      user.otp = null;
      await this.usersRepo.save(user);
      return 'Password reset successfully';
    } catch {
      throw new InternalServerErrorException('Failed To Resend Password');
    }
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('user not found');

    try {
      const isMatch = await bcrypt.compare(oldPassword, user.password);

      if (!isMatch)
        throw new UnauthorizedException('Old password is incorrect');

      user.password = await bcrypt.hash(newPassword, 10);

      await this.usersRepo.save(user);

      return { message: 'Password updated successfully' };
    } catch {
      throw new InternalServerErrorException('Failed To change Password');
    }
  }

  async login(user: User) {
    try {
      const jwtPayload = { sub: user.id, role: user.role, email: user.email };
      const access_token = this.jwtService.sign(jwtPayload);

      const refreshToken = this.jwtService.sign(jwtPayload, {
        expiresIn: '2m',
      });
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
      this.usersRepo.update(
        { id: user.id },
        { refreshToken: hashedRefreshToken },
      );

      return ApiResponse.success(
        {
          access_token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
        'Login successful',
        HttpStatus.OK,
      );
    } catch {
      throw new InternalServerErrorException('Token generation failed');
    }
  }

  loginWithPhone(user: User) {
    try {
      const jwtPayload = { sub: user.id, role: user.role, email: user.email };
      const access_token = this.jwtService.sign(jwtPayload);

      return ApiResponse.success(
        {
          access_token,
          user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            role: user.role,
          },
        },
        'Login successful',
        HttpStatus.OK,
      );
    } catch {
      throw new InternalServerErrorException('Token generation failed');
    }
  }

  async googleSignin(idToken: string) {
    try {
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

      const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new BadRequestException('Invalid Google ID token');
      }

      const { email, name, picture } = payload;

      const user = await this.usersRepo.findOne({ where: { email } });

      if (user) {
        const jwtPayload = { sub: user.id, role: user.role, email: user.email };
        const access_token = this.jwtService.sign(jwtPayload);

        return ApiResponse.success(
          {
            access_token,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              profileImage: user.profileImage,
            },
            isNewUser: false,
          },
          'Google sign-in successful',
          HttpStatus.OK,
        );
      } else {
        const newUser = this.usersRepo.create({
          name: name || 'Google User',
          email,
          password: '',
          role: UserRole.BUYER,
          ...(picture && { profileImage: picture }),
        });

        const savedUser = await this.usersRepo.save(newUser);

        const jwtPayload = {
          sub: savedUser.id,
          role: savedUser.role,
          email: savedUser.email,
        };
        const access_token = this.jwtService.sign(jwtPayload);

        return ApiResponse.success(
          {
            access_token,
            user: {
              id: savedUser.id,
              name: savedUser.name,
              email: savedUser.email,
              role: savedUser.role,
              profileImage: savedUser.profileImage,
            },
            isNewUser: true,
          },
          'Google sign-in successful - New user created',
          HttpStatus.CREATED,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Google sign-in failed');
    }
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    profileImage?: Express.Multer.File,
  ) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      let profileImageUrl: string | undefined;

      if (profileImage) {
        if (user.profileImage) {
          const publicId = this.cloudinaryService.extractPublicId(
            user.profileImage,
          );
          if (publicId) {
            await this.cloudinaryService.deleteImage(publicId);
          }
        }

        const uploadResult =
          await this.cloudinaryService.uploadImage(profileImage);
        profileImageUrl =
          'secure_url' in uploadResult
            ? (uploadResult as { secure_url: string }).secure_url
            : undefined;

        if (!profileImageUrl) {
          throw new BadRequestException(
            'Cloudinary upload failed or secure_url missing',
          );
        }
      }

      const updateData: Partial<UpdateProfileDto> = {};
      if (dto.name) updateData.name = dto.name;
      if (dto.phone) updateData.phone = dto.phone;
      if (dto.city) updateData.city = dto.city;
      if (dto.country) updateData.country = dto.country;
      if (dto.postalCode) updateData.postalCode = dto.postalCode;
      if (dto.state) updateData.state = dto.state;
      if (dto.address) updateData.address = dto.address;
      if (profileImageUrl) updateData.profileImage = profileImageUrl;

      await this.usersRepo.update(userId, updateData);

      return 'Profile updated successfully';
    } catch {
      throw new InternalServerErrorException('Failed to update profile');
    }
  }

  private async handleSellerFiles(
    userId: string,
    files: Array<{ image: string; type: string }>,
  ): Promise<void> {
    try {
      if (files.length === 0) return;

      const sellerFiles: SellerFile[] = [];

      for (const file of files) {
        if (!file.image || !file.type) continue;

        sellerFiles.push(
          this.sellerFileRepo.create({
            userId,
            type: file.type,
            fileUrl: file.image,
          }),
        );
      }

      if (sellerFiles.length > 0) {
        await this.sellerFileRepo.save(sellerFiles);
      }
    } catch (error) {
      console.error('Failed to handle seller files:', error);
    }
  }

  async findAll(query: UsersQueryDto) {
    try {
      const { page = 1, limit = 5, search, service } = query || {};
      const skip = (page - 1) * limit;

      const where = search
        ? [{ name: ILike(`%${search}%`) }, { email: ILike(`%${search}%`) }]
        : undefined;

      const [users, total] = await this.usersRepo.findAndCount({
        select: [
          'id',
          'name',
          'email',
          'city',
          'country',
          'address',
          'postalCode',
          'phone',
          'role',
          'profileImage',
          'isActive',
          'profileImage',
          'createdAt',
          'updatedAt',
        ],

        where,
        relations: service ? ['gigs'] : [],
        skip,
        take: limit,
      });

      // Add seller stats for each user
      const data = await Promise.all(
        users.map(async (user) => {
          const sellerStats = await this.getSellerStats(user.id);
          return {
            ...user,
            sellerStats,
          };
        }),
      );

      return {
        data,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      };
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async findUserById(id: string) {
    const user = await this.usersRepo.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(
        `User not found or role mismatch (id: ${id})`,
      );
    }

    // Add seller stats
    const sellerStats = await this.getSellerStats(id);

    return {
      ...user,
      sellerStats,
    };
  }

  // Helper method to get seller statistics
  private async getSellerStats(userId: string): Promise<{
    level: number | null;
    averageArrivalRating: number | null;
    completedBookings: number;
  } | null> {
    // Get seller data
    const seller = await this.sellerRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!seller) {
      return null;
    }

    // Get seller's gigs
    const sellerGigs = await this.gigRepository.find({
      where: { sellerId: userId },
      select: ['id'],
    });

    if (sellerGigs.length === 0) {
      return {
        level: seller.level,
        averageArrivalRating: null,
        completedBookings: 0,
      };
    }

    const gigIds = sellerGigs.map((gig) => gig.id);

    // Get completed bookings count
    const completedBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.gigId IN (:...gigIds)', { gigIds })
      .andWhere('booking.completeJob = :complete', { complete: true })
      .getCount();

    // Get average arrival rating
    const arrivalRatingResult = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('AVG(booking.arrivalRating)', 'avgRating')
      .where('booking.gigId IN (:...gigIds)', { gigIds })
      .andWhere('booking.arrivalRating IS NOT NULL')
      .getRawOne();

    const averageArrivalRating = arrivalRatingResult?.avgRating
      ? parseFloat(parseFloat(arrivalRatingResult.avgRating).toFixed(2))
      : null;

    return {
      level: seller.level,
      averageArrivalRating,
      completedBookings,
    };
  }

  async deleteUser(userId: string, id: string, role: UserRole) {
    if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) {
      const user = await this.usersRepo.findOne({ where: { id } });

      if (!user) {
        throw new NotFoundException(`User not found (id: ${id})`);
      }

      await this.removeUserDependencies(user.id);
      await this.usersRepo.remove(user);
      return `User (id: ${id}) deleted by admin`;
    }

    if (userId !== id) {
      throw new ForbiddenException(
        'You are not allowed to delete another user',
      );
    }

    const user = await this.usersRepo.findOne({
      where: { id: userId, role },
    });

    if (!user) {
      throw new NotFoundException(
        `User not found or role mismatch (id: ${userId}, role: ${role})`,
      );
    }

    await this.removeUserDependencies(user.id);
    await this.usersRepo.remove(user);
    return 'Your account has been deleted successfully';
  }

  async updateUnpausedAndPaused(
    id: string,
    sellerAccountStatus: SellerAccountStatus,
    userId: string,
  ) {
    const user = await this.usersRepo.findOne({
      where: { id, role: UserRole.SELLER },
    });
    if (!user) throw new NotFoundException(`Seller not found!`);

    try {
      let successMessage = '';
      if (sellerAccountStatus === SellerAccountStatus.PAUSED) {
        user.status = UserStatus.INACTIVE;
        successMessage = 'Seller Paused successfully!';
      } else if (sellerAccountStatus === SellerAccountStatus.UNPAUSED) {
        user.status = UserStatus.ACTIVE;
        successMessage = 'Seller Unpaused successfully!';
      }

      await this.usersRepo.save(user);
      const sender = await this.usersRepo.findOne({ where: { id: userId } });
      const receiver = await this.usersRepo.findOne({
        where: { id: user.id },
      });

      const notificationPayload: CreateNotificationDto = {
        receiver: receiver!,
        sender: sender!,
        title: 'Status Notification',
        message: `your account is ${sellerAccountStatus === SellerAccountStatus.PAUSED ? 'paused' : 'unpaused'}`,
      };
      console.log({ notificationPayload });
      await this.notificationService.create(notificationPayload);
      return successMessage;
    } catch (error) {
      console.log(error);
      throw new NotFoundException('Update Status Failed');
    }
  }

  private async removeUserDependencies(userId: string): Promise<void> {
    try {
      await this.gigFavouriteRepository.delete({ userId });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to remove user favourites: ${errorMessage}`,
      );
    }
  }

  async logout(userId: string) {
    await this.usersRepo.update({ id: userId }, { refreshToken: null });

    return {
      message: 'Logged out successfully',
    };
  }
}
