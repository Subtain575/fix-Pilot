import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { GetAddressesDto } from './dto/get-addresses.dto';
import { ApiResponse } from '../common/utils/response.util';

@Injectable()
export class AddressesService {
  private readonly logger = new Logger(AddressesService.name);

  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
  ) {}

  async create(
    createAddressDto: CreateAddressDto,
  ): Promise<ApiResponse<Address>> {
    try {
      this.logger.log('Creating new address');

      const address = this.addressRepository.create(createAddressDto);

      const savedAddress = await this.addressRepository.save(address);

      this.logger.log(
        `Address created successfully with ID: ${savedAddress.id}`,
      );

      return ApiResponse.success(savedAddress, 'Address created successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(
        `Failed to create address: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        `Failed to create address: ${errorMessage}`,
      );
    }
  }

  async findAll(query: GetAddressesDto): Promise<
    ApiResponse<{
      addresses: Address[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>
  > {
    try {
      this.logger.log('Fetching all addresses');

      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;
      const skip = (page - 1) * limit;

      const [addresses, total] = await this.addressRepository.findAndCount({
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);

      return ApiResponse.success(
        {
          addresses,
          total,
          page,
          limit,
          totalPages,
        },
        'Addresses retrieved successfully',
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(
        `Failed to fetch addresses: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        `Failed to fetch addresses: ${errorMessage}`,
      );
    }
  }
}
