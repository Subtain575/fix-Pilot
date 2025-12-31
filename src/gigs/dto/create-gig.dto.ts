import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { Type, Transform, Expose, plainToClass } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek } from '../entities/gig-availability.entity';

export class AvailabilityHourDto {
  @ApiProperty({ description: 'Day of the week', enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  @Transform(({ value }): DayOfWeek => {
    if (typeof value === 'string') {
      return value.toLowerCase() as DayOfWeek;
    }
    return value as DayOfWeek;
  })
  @Expose()
  day: DayOfWeek;

  @ApiProperty({ description: 'Whether available on this day', default: false })
  @IsBoolean()
  @Transform(({ value }): boolean => {
    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return Boolean(value);
  })
  @Expose()
  isAvailable: boolean;

  @ApiProperty({
    description: 'Start time (HH:mm format)',
    required: false,
    example: '09:00',
  })
  @IsOptional()
  @IsString()
  @Expose()
  startTime?: string;

  @ApiProperty({
    description: 'End time (HH:mm format)',
    required: false,
    example: '17:00',
  })
  @IsOptional()
  @IsString()
  @Expose()
  endTime?: string;
}

export class CreateGigDto {
  @ApiProperty({
    description: 'Title of the gig',
    example: 'Professional Photographer',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Category ID',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({
    description: 'Short description of the gig',
    example: 'Expert in wedding and event photography',
  })
  @IsString()
  shortDescription: string;

  @ApiProperty({ description: 'Starting price', minimum: 0, example: 5000 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  priceFrom: number;

  @ApiProperty({ description: 'Service area', example: 'Multan, Punjab' })
  @IsString()
  serviceArea: string;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 30.1575,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 71.5249,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @ApiProperty({
    description: 'Upload gig photos',
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
  })
  @IsOptional()
  photos?: unknown;

  @ApiProperty({
    description:
      'Availability (Mon–Sun). In form-data you can send this as a JSON string or as an array. Each item should include day, isAvailable, startTime and endTime.',
    required: false,
    type: 'array',
    items: {
      type: 'object',
      properties: {
        day: { type: 'string', enum: Object.values(DayOfWeek) },
        isAvailable: { type: 'boolean' },
        startTime: { type: 'string', example: '09:00', nullable: true },
        endTime: { type: 'string', example: '17:00', nullable: true },
      },
    },
    example: [
      {
        day: 'monday',
        isAvailable: true,
        startTime: '09:00',
        endTime: '17:00',
      },
      {
        day: 'tuesday',
        isAvailable: true,
        startTime: '09:00',
        endTime: '17:00',
      },
      {
        day: 'wednesday',
        isAvailable: true,
        startTime: '09:00',
        endTime: '17:00',
      },
      {
        day: 'thursday',
        isAvailable: true,
        startTime: '09:00',
        endTime: '17:00',
      },
      {
        day: 'friday',
        isAvailable: true,
        startTime: '09:00',
        endTime: '17:00',
      },
      { day: 'saturday', isAvailable: false, startTime: null, endTime: null },
      { day: 'sunday', isAvailable: false, startTime: null, endTime: null },
    ],
  })
  @IsOptional()
  @Transform(({ value }): AvailabilityHourDto[] | undefined => {
    if (!value) return undefined;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      const wrapAndParse = (s: string): AvailabilityHourDto[] | undefined => {
        try {
          const parsed: unknown = JSON.parse(s);
          const arr: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
          return arr
            .filter(
              (it): it is Record<string, unknown> =>
                typeof it === 'object' && it !== null,
            )
            .map((item) =>
              plainToClass(AvailabilityHourDto, item, {
                excludeExtraneousValues: false,
              }),
            );
        } catch {
          return undefined;
        }
      };

      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const out = wrapAndParse(trimmed);
        if (out) return out;
      }
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const out = wrapAndParse(`[${trimmed}]`);
        if (out) return out;
      }
      if (trimmed.includes('},{')) {
        const out = wrapAndParse(`[${trimmed}]`);
        if (out) return out;
      }
      return undefined;
    }

    if (!Array.isArray(value) && typeof value === 'object' && value !== null) {
      return [
        plainToClass(AvailabilityHourDto, value as Record<string, unknown>, {
          excludeExtraneousValues: false,
        }),
      ];
    }

    if (Array.isArray(value)) {
      return value.map((v) => {
        if (typeof v === 'string') {
          try {
            const parsed: unknown = JSON.parse(v);
            return plainToClass(
              AvailabilityHourDto,
              parsed as Record<string, unknown>,
              {
                excludeExtraneousValues: false,
              },
            );
          } catch {
            return plainToClass(
              AvailabilityHourDto,
              {} as Record<string, unknown>,
              {
                excludeExtraneousValues: false,
              },
            );
          }
        }
        return plainToClass(AvailabilityHourDto, v as Record<string, unknown>, {
          excludeExtraneousValues: false,
        });
      });
    }

    return undefined;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityHourDto)
  availabilityHours?: AvailabilityHourDto[];
}
