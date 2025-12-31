import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PlanManagement } from './entities/plan-management.entity';
import { Repository } from 'typeorm';
import { CreatePlanManagementDto } from './dto/create-plan-management.dto';
import { GetPlansDto } from './dto/query-plan-dto';
import { planTypeEnum } from './Enum/plan-type-enum';
import { UpdatePlanManagementDto } from './dto/update-plan-management.dto';

@Injectable()
export class PlanManagementService {
  @InjectRepository(PlanManagement)
  private readonly planManageRepository: Repository<PlanManagement>;

  async create(createPlanManagementDto: CreatePlanManagementDto) {
    if (createPlanManagementDto.planType === planTypeEnum.BASIC) {
      createPlanManagementDto.price = 0;
    }

    if (
      createPlanManagementDto.planType !== planTypeEnum.BASIC &&
      !createPlanManagementDto.price
    ) {
      throw new BadRequestException('Price is required for non-basic plans');
    }

    const newPlan = this.planManageRepository.create(createPlanManagementDto);
    const savedPlan = await this.planManageRepository.save(newPlan);

    return {
      message: 'Plan created successfully',
      data: savedPlan,
    };
  }

  async findAll(query: GetPlansDto) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;

    const skip = (page - 1) * limit;

    const [plans, count] = await this.planManageRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      message: 'Plans fetched successfully',
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      data: plans,
    };
  }

  async update(id: string, updateDto: UpdatePlanManagementDto) {
    const plan = await this.planManageRepository.findOne({ where: { id } });
  
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
  
    // Update simple fields
    plan.planType = updateDto.planType ?? plan.planType;
    plan.country = updateDto.country ?? plan.country;
  
    // ✅ Correct price logic
    if (plan.planType === planTypeEnum.BASIC) {
      plan.price = 0;
    } else {
      if (updateDto.price === undefined || updateDto.price === null) {
        throw new BadRequestException('Price is required for non-basic plans');
      }
      plan.price = updateDto.price;
    }
  
    const updated = await this.planManageRepository.save(plan);
  
    return {
      message: 'Plan updated successfully',
      data: updated,
    };
  }
  
  }

