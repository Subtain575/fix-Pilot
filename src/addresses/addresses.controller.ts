import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { GetAddressesDto } from './dto/get-addresses.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Addresses')
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new address' })
  async create(@Body() createAddressDto: CreateAddressDto) {
    return this.addressesService.create(createAddressDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all addresses with pagination' })
  async findAll(@Query() query: GetAddressesDto) {
    return this.addressesService.findAll(query);
  }
}
