import { HttpStatus } from '@nestjs/common';

export class ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;

  constructor(success: boolean, statusCode: number, message: string, data?: T) {
    this.success = success;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  static success<T>(
    data: T,
    message = 'Operation successful',
    statusCode = HttpStatus.OK,
  ): ApiResponse<T> {
    return new ApiResponse(true, statusCode, message, data);
  }

  static error<T>(
    message = 'Operation failed',
    statusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    data?: T,
  ): ApiResponse<T> {
    return new ApiResponse(false, statusCode, message, data);
  }
}
