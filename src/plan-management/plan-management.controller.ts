import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PlanManagementService } from './plan-management.service';
import { CreatePlanManagementDto } from './dto/create-plan-management.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { GetPlansDto } from './dto/query-plan-dto';
import { UpdatePlanManagementDto } from './dto/update-plan-management.dto';
import { JwtAuthGuard } from 'src/users/auth/guard/jwt/jwt-auth.guard';
import { UserRole } from 'src/users/auth/enums/enum';
import { Roles } from 'src/users/auth/guard/role/roles.decorator';

@Controller('plan-management')
export class PlanManagementController {
  constructor(private readonly planManagementService: PlanManagementService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-plan')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'create the plan management' })
  @SwaggerResponse({
    status: 200,
    description: 'create the plan management',
  })
  create(@Body() createPlanManagementDto: CreatePlanManagementDto) {
    return this.planManagementService.create(createPlanManagementDto);
  }

  @Get('all-plans')
  @ApiOperation({ summary: 'get all the plan management' })
  @SwaggerResponse({
    status: 200,
    description: 'get all the plan management',
  })
  findAll(@Query() query: GetPlansDto) {
    return this.planManagementService.findAll(query);
  }
  
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update plan type or country' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  update(@Param('id') id: string, @Body() updateDto: UpdatePlanManagementDto) {
    return this.planManagementService.update(id, updateDto);
  }
}
