import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { MessagesListResponseDto } from './dto/message-response.dto';
import { JwtAuthGuard } from '../users/auth/guard/jwt/jwt-auth.guard';
import { RolesGuard } from '../users/auth/guard/role/roles.guard';
import { Roles } from '../users/auth/guard/role/roles.decorator';
import { UserRole } from '../users/auth/enums/enum';
import { User } from '../users/auth/entity/users.entity';

interface AuthenticatedRequest extends Request {
  user: User;
}

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversation')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or get conversation (Any user can create)' })
  @ApiResponse({
    status: 201,
    description: 'Conversation created or retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Receiver or Gig not found' })
  createConversation(
    @Body() createConversationDto: CreateConversationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.chatService.createOrGetConversation(
      req.user.id,
      createConversationDto,
    );
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all conversations for current user (IDs only)',
    description:
      'Returns all conversations where the authenticated user is either the seller or buyer. Returns only IDs (id, sellerId, buyerId, gigId, createdAt). Both seller and buyer can see their conversations using their token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversations retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              sellerId: { type: 'string' },
              buyerId: { type: 'string' },
              gigId: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  getConversations(@Request() req: AuthenticatedRequest) {
    return this.chatService.getConversations(req.user.id);
  }

  @Get('admin/all-conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all conversations (Admin only)',
    description:
      'Returns all conversations in the system with full details. Admin can see all conversations regardless of seller or buyer.',
  })
  @ApiResponse({
    status: 200,
    description: 'All conversations retrieved successfully',
    type: [ConversationResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  getAllConversations() {
    return this.chatService.getAllConversations();
  }

  @Post('message')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 400, description: 'Unauthorized to send message' })
  sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.chatService.sendMessage(req.user.id, sendMessageDto);
  }

  @Get('messages/:conversationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get messages for a conversation',
    description:
      'Returns all messages in a conversation. Both seller and buyer can view messages using their token. The receiver can also see all chats.',
  })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
    type: MessagesListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiResponse({ status: 400, description: 'Unauthorized to view messages' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMessages(
    @Param('conversationId') conversationId: string,
    @Query() query: GetMessagesDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.chatService.getMessages(conversationId, req.user.id, query);
  }
}
