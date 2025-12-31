import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  Request,
} from '@nestjs/common';

import { CreateStrikeDto } from './dto/create-strike.dto';

import { Roles } from 'src/users/auth/guard/role/roles.decorator';
import { StrikeService } from './strike.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/users/auth/guard/jwt/jwt-auth.guard';
import { StrikeQueryDto } from './dto/strike-query.dto';
import { UserRole } from 'src/users/auth/enums/enum';
import { RolesGuard } from 'src/users/auth/guard/role/roles.guard';
import { User } from 'src/users/auth/entity/users.entity';

@Controller('strike')
export class StrikeController {
  constructor(private readonly strikeService: StrikeService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add strike to a seller (Admin only)' })
  @SwaggerResponse({ status: 200, description: 'Strike Added successful' })
  addStrike(
    @Req() req: Request & { user: User },
    @Body() dto: CreateStrikeDto,
  ) {
    const senderId = req.user.id;
    return this.strikeService.addStrike(dto, senderId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove strike from seller (Admin only)' })
  @SwaggerResponse({ status: 200, description: 'Strike delete successful' })
  removeStrike(@Req() req: Request & { user: User }, @Param('id') id: string) {
    const userId = req.user.id;
    return this.strikeService.removeStrike(id, userId);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all strikes with seller info (Admin only)' })
  findAll(@Query() dto: StrikeQueryDto) {
    return this.strikeService.findAll(dto);
  }
}
