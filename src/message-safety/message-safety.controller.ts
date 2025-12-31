import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MessageSafetyService } from './message-safety.service';
import { CreateViolationDto } from './dto/create-message-safety.dto';
import { FilterViolationsDto } from './dto/message-query.dto';
import { ViolationActionDto } from './dto/action-message.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/users/auth/guard/jwt/jwt-auth.guard';
import { UserRole } from 'src/users/auth/enums/enum';
import { Roles } from 'src/users/auth/guard/role/roles.decorator';
import { UpdateStatusDto } from './dto/update-status.dto';
import { RolesGuard } from 'src/users/auth/guard/role/roles.guard';
@Controller('message-safety')
export class MessageSafetyController {
  constructor(private readonly messageService: MessageSafetyService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('send-message')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'send message' })
  @SwaggerResponse({
    status: 200,
    description: 'send message successfully',
  })
  create(@Body() dto: CreateViolationDto) {
    return this.messageService.create(dto);
  }

  @Get('get-all')
  @ApiOperation({ summary: 'get all message' })
  @SwaggerResponse({
    status: 200,
    description: 'get all message',
  })
  findAll(@Query() filter: FilterViolationsDto) {
    return this.messageService.findAll(filter);
  }

  @UseGuards(JwtAuthGuard)
  @Post('action')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Take action on a violation',
    description: 'Apply an action such as warning on a specific violation.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Action executed successfully on the violation.',
  })
  takeAction(@Body() dto: ViolationActionDto) {
    return this.messageService.takeAction(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('update-status/:id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update violation status (Pending → Reviewed)' })
  @SwaggerResponse({
    status: 200,
    description: 'Violation status updated successfully',
  })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.messageService.updateStatus(id, dto);
  }
}
