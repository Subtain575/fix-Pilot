import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';
import { ApiResponse } from '../common/utils/response.util';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    try {
      const existingCategory = await this.categoryRepository.findOne({
        where: { name: createCategoryDto.name },
      });

      if (existingCategory) {
        throw new BadRequestException('Category with this name already exists');
      }

      const category = this.categoryRepository.create(createCategoryDto);
      const savedCategory = await this.categoryRepository.save(category);

      return ApiResponse.success(
        savedCategory,
        'Category created successfully',
        HttpStatus.CREATED,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create category');
    }
  }

  async findAll() {
    try {
      const categories = await this.categoryRepository.find({
        order: { createdAt: 'DESC' },
      });

      return ApiResponse.success(
        categories,
        'Categories retrieved successfully',
        HttpStatus.OK,
      );
    } catch {
      throw new InternalServerErrorException('Failed to retrieve categories');
    }
  }

  async findOne(id: string) {
    try {
      const category = await this.categoryRepository.findOne({
        where: { id },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      return ApiResponse.success(
        category,
        'Category retrieved successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve category');
    }
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    try {
      const category = await this.categoryRepository.findOne({
        where: { id },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      const dtoName = (updateCategoryDto as { name?: string }).name;
      if (dtoName && dtoName !== category.name) {
        const existingCategory = await this.categoryRepository.findOne({
          where: { name: dtoName },
        });

        if (existingCategory) {
          throw new BadRequestException(
            'Category with this name already exists',
          );
        }
      }

      Object.assign(category, updateCategoryDto);
      const updatedCategory = await this.categoryRepository.save(category);

      return ApiResponse.success(
        updatedCategory,
        'Category updated successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update category');
    }
  }

  async remove(id: string) {
    try {
      const category = await this.categoryRepository.findOne({
        where: { id },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      await this.categoryRepository.delete(id);

      return ApiResponse.success(
        null,
        'Category deleted successfully',
        HttpStatus.OK,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete category');
    }
  }
}
