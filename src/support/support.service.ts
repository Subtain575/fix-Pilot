import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportRequest } from './entities/support-request.entity';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';
import { ApiResponse } from '../common/utils/response.util';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @InjectRepository(SupportRequest)
    private readonly supportRequestRepository: Repository<SupportRequest>,
  ) {}

  async create(
    createSupportRequestDto: CreateSupportRequestDto,
  ): Promise<ApiResponse<SupportRequest>> {
    try {
      this.logger.log('Creating new support request');

      const supportRequest = this.supportRequestRepository.create(
        createSupportRequestDto,
      );

      const savedRequest =
        await this.supportRequestRepository.save(supportRequest);

      this.logger.log(
        `Support request created successfully with ID: ${savedRequest.id}`,
      );

      return ApiResponse.success(
        savedRequest,
        'Support request submitted successfully',
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(
        `Failed to create support request: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        `Failed to create support request: ${errorMessage}`,
      );
    }
  }

  async findAll(): Promise<ApiResponse<SupportRequest[]>> {
    try {
      this.logger.log('Fetching all support requests');

      const supportRequests = await this.supportRequestRepository.find({
        order: { createdAt: 'DESC' },
      });

      return ApiResponse.success(
        supportRequests,
        'Support requests retrieved successfully',
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(
        `Failed to fetch support requests: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        `Failed to fetch support requests: ${errorMessage}`,
      );
    }
  }
}
