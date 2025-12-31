import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, IsNull } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { ApiResponse } from '../common/utils/response.util';
import { User } from '../users/auth/entity/users.entity';
import { Gig } from '../gigs/entities/gig.entity';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Gig)
    private readonly gigRepository: Repository<Gig>,
  ) {}

  async createOrGetConversation(
    userId: string,
    createConversationDto: CreateConversationDto,
  ) {
    try {
      const receiver = await this.userRepository.findOne({
        where: { id: createConversationDto.receiverId },
      });

      if (!receiver) {
        throw new NotFoundException('Receiver not found');
      }

      const sender = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!sender) {
        throw new NotFoundException('Sender not found');
      }

      if (userId === createConversationDto.receiverId) {
        throw new BadRequestException(
          'Cannot create conversation with yourself',
        );
      }

      let sellerId: string;
      let buyerId: string;

      if (createConversationDto.gigId) {
        const gig = await this.gigRepository.findOne({
          where: { id: createConversationDto.gigId },
        });

        if (!gig) {
          throw new NotFoundException('Gig not found');
        }

        if (!gig.sellerId) {
          throw new BadRequestException('Gig does not have a valid seller');
        }

        sellerId = gig.sellerId;
        buyerId =
          gig.sellerId === userId ? createConversationDto.receiverId : userId;
      } else {
        sellerId = userId;
        buyerId = createConversationDto.receiverId;
      }

      const whereCondition1: FindOptionsWhere<Conversation> = {
        sellerId,
        buyerId,
      };

      const whereCondition2: FindOptionsWhere<Conversation> = {
        sellerId: buyerId,
        buyerId: sellerId,
      };

      if (createConversationDto.gigId) {
        whereCondition1.gigId = createConversationDto.gigId;
        whereCondition2.gigId = createConversationDto.gigId;
      } else {
        whereCondition1.gigId = IsNull();
        whereCondition2.gigId = IsNull();
      }

      let existingConversation = await this.conversationRepository.findOne({
        where: whereCondition1,
        relations: ['seller', 'buyer', 'gig'],
      });

      if (!existingConversation) {
        existingConversation = await this.conversationRepository.findOne({
          where: whereCondition2,
          relations: ['seller', 'buyer', 'gig'],
        });
      }

      if (existingConversation) {
        if (!existingConversation.seller) {
          this.logger.error(
            `Seller is null for existing conversation: ${existingConversation.id}`,
          );
          throw new InternalServerErrorException(
            'Failed to load seller information',
          );
        }

        if (!existingConversation.buyer) {
          this.logger.error(
            `Buyer is null for existing conversation: ${existingConversation.id}`,
          );
          throw new InternalServerErrorException(
            'Failed to load buyer information',
          );
        }

        return ApiResponse.success(
          {
            id: existingConversation.id,
            sellerId: existingConversation.sellerId,
            buyerId: existingConversation.buyerId,
            gigId: existingConversation.gigId,
            createdAt: existingConversation.createdAt,
            seller: {
              id: existingConversation.seller.id,
              name: existingConversation.seller.name,
              email: existingConversation.seller.email,
            },
            buyer: {
              id: existingConversation.buyer.id,
              name: existingConversation.buyer.name,
              email: existingConversation.buyer.email,
            },
            gig: existingConversation.gig
              ? {
                  id: existingConversation.gig.id,
                  title: existingConversation.gig.title,
                }
              : null,
          },
          'Conversation retrieved successfully',
        );
      }

      if (!sellerId || !buyerId) {
        this.logger.error(
          `Cannot create conversation: sellerId=${sellerId}, buyerId=${buyerId}, userId=${userId}, receiverId=${createConversationDto.receiverId}`,
        );
        throw new BadRequestException(
          'Invalid conversation data. Seller or buyer ID is missing.',
        );
      }

      const conversationData: Partial<Conversation> = {
        sellerId,
        buyerId,
      };

      if (createConversationDto.gigId) {
        conversationData.gigId = createConversationDto.gigId;
      }

      const conversation = this.conversationRepository.create(conversationData);

      const savedConversation =
        await this.conversationRepository.save(conversation);

      const conversationWithRelations =
        await this.conversationRepository.findOne({
          where: { id: savedConversation.id },
          relations: ['seller', 'buyer', 'gig'],
        });

      if (!conversationWithRelations) {
        this.logger.error(
          `Conversation not found after creation: ${savedConversation.id}`,
        );
        throw new InternalServerErrorException(
          'Failed to retrieve created conversation',
        );
      }

      if (!conversationWithRelations.seller) {
        this.logger.error(
          `Seller is null for conversation: ${savedConversation.id}, sellerId: ${savedConversation.sellerId}`,
        );
        throw new InternalServerErrorException(
          'Failed to load seller information',
        );
      }

      if (!conversationWithRelations.buyer) {
        this.logger.error(
          `Buyer is null for conversation: ${savedConversation.id}, buyerId: ${savedConversation.buyerId}`,
        );
        throw new InternalServerErrorException(
          'Failed to load buyer information',
        );
      }

      return ApiResponse.success(
        {
          id: conversationWithRelations.id,
          sellerId: conversationWithRelations.sellerId,
          buyerId: conversationWithRelations.buyerId,
          gigId: conversationWithRelations.gigId,
          createdAt: conversationWithRelations.createdAt,
          seller: {
            id: conversationWithRelations.seller.id,
            name: conversationWithRelations.seller.name,
            email: conversationWithRelations.seller.email,
          },
          buyer: {
            id: conversationWithRelations.buyer.id,
            name: conversationWithRelations.buyer.name,
            email: conversationWithRelations.buyer.email,
          },
          gig: conversationWithRelations.gig
            ? {
                id: conversationWithRelations.gig.id,
                title: conversationWithRelations.gig.title,
              }
            : null,
        },
        'Conversation created successfully',
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create conversation: ${errorMessage}`);
      this.logger.error(
        `Context: userId=${userId}, receiverId=${createConversationDto.receiverId}, gigId=${createConversationDto.gigId}`,
      );
      throw new InternalServerErrorException(
        `Failed to create conversation: ${errorMessage}`,
      );
    }
  }

  async sendMessage(senderId: string, sendMessageDto: SendMessageDto) {
    try {
      if (!sendMessageDto.message && !sendMessageDto.fileUrl) {
        throw new BadRequestException(
          'Either message or fileUrl must be provided',
        );
      }

      if (sendMessageDto.fileUrl && !sendMessageDto.fileType) {
        throw new BadRequestException(
          'fileType is required when fileUrl is provided',
        );
      }

      const conversation = await this.conversationRepository.findOne({
        where: { id: sendMessageDto.conversationId },
        relations: ['seller', 'buyer'],
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      if (
        conversation.sellerId !== senderId &&
        conversation.buyerId !== senderId
      ) {
        throw new BadRequestException(
          'You are not authorized to send messages in this conversation',
        );
      }

      const messageData: Partial<Message> = {
        roomId: sendMessageDto.conversationId,
        senderId,
        message: sendMessageDto.message || null,
        fileUrl: sendMessageDto.fileUrl || null,
        fileType: sendMessageDto.fileType || null,
      };

      const message = this.messageRepository.create(messageData);
      const savedMessage = await this.messageRepository.save(message);

      const messageWithRelations = await this.messageRepository.findOne({
        where: { id: savedMessage.id },
        relations: ['sender', 'conversation'],
      });

      return ApiResponse.success(
        {
          id: messageWithRelations!.id,
          conversationId: messageWithRelations!.roomId,
          senderId: messageWithRelations!.senderId,
          message: messageWithRelations!.message,
          fileUrl: messageWithRelations!.fileUrl,
          fileType: messageWithRelations!.fileType,
          createdAt: messageWithRelations!.createdAt,
          sender: {
            id: messageWithRelations!.sender.id,
            name: messageWithRelations!.sender.name,
            email: messageWithRelations!.sender.email,
          },
        },
        'Message sent successfully',
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Failed to send message: ${error}`);
      throw new InternalServerErrorException('Failed to send message');
    }
  }

  async getMessages(
    conversationId: string,
    userId: string,
    query: GetMessagesDto,
  ) {
    try {
      const conversation = await this.conversationRepository.findOne({
        where: { id: conversationId },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      if (conversation.sellerId !== userId && conversation.buyerId !== userId) {
        throw new BadRequestException(
          'You are not authorized to view messages in this conversation',
        );
      }

      const { page = 1, limit = 50 } = query;
      const skip = (page - 1) * limit;

      const [messages, total] = await this.messageRepository.findAndCount({
        where: { roomId: conversationId },
        relations: ['sender'],
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });

      const sortedMessages = messages.reverse();

      return ApiResponse.success(
        {
          items: sortedMessages.map((msg) => ({
            id: msg.id,
            conversationId: msg.roomId,
            senderId: msg.senderId,
            message: msg.message,
            fileUrl: msg.fileUrl,
            fileType: msg.fileType,
            createdAt: msg.createdAt,
            sender: {
              id: msg.sender.id,
              name: msg.sender.name,
              email: msg.sender.email,
            },
          })),
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
        'Messages retrieved successfully',
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Failed to get messages: ${error}`);
      throw new InternalServerErrorException('Failed to get messages');
    }
  }

  async getConversations(userId: string) {
    try {
      const conversations = await this.conversationRepository.find({
        where: [{ sellerId: userId }, { buyerId: userId }],
        relations: ['seller', 'buyer', 'gig'],
        order: { createdAt: 'DESC' },
      });

      return ApiResponse.success(
        conversations.map((conv) => ({
          id: conv.id,
          sellerId: conv.sellerId,
          buyerId: conv.buyerId,
          gigId: conv.gigId,
          createdAt: conv.createdAt,
          seller: conv.seller
            ? {
                id: conv.seller.id,
                name: conv.seller.name,
                email: conv.seller.email,
                profileImage: conv.seller.profileImage,
              }
            : null,
          buyer: conv.buyer
            ? {
                id: conv.buyer.id,
                name: conv.buyer.name,
                email: conv.buyer.email,
                profileImage: conv.buyer.profileImage,
              }
            : null,
          gig: conv.gig
            ? {
                id: conv.gig.id,
                title: conv.gig.title,
              }
            : null,
        })),
        'Conversations retrieved successfully',
      );
    } catch (error) {
      this.logger.error(`Failed to get conversations: ${error}`);
      throw new InternalServerErrorException('Failed to get conversations');
    }
  }

  async getAllConversations() {
    try {
      const conversations = await this.conversationRepository.find({
        relations: ['seller', 'buyer', 'gig'],
        order: { createdAt: 'DESC' },
      });

      return ApiResponse.success(
        conversations.map((conv) => ({
          id: conv.id,
          sellerId: conv.sellerId,
          buyerId: conv.buyerId,
          gigId: conv.gigId,
          createdAt: conv.createdAt,
          seller: {
            id: conv.seller.id,
            name: conv.seller.name,
            email: conv.seller.email,
          },
          buyer: {
            id: conv.buyer.id,
            name: conv.buyer.name,
            email: conv.buyer.email,
          },
          gig: conv.gig
            ? {
                id: conv.gig.id,
                title: conv.gig.title,
              }
            : null,
        })),
        'All conversations retrieved successfully',
      );
    } catch (error) {
      this.logger.error(`Failed to get all conversations: ${error}`);
      throw new InternalServerErrorException('Failed to get all conversations');
    }
  }

  async getConversationForSocket(conversationId: string, userId: string) {
    try {
      const conversation = await this.conversationRepository.findOne({
        where: { id: conversationId },
      });

      if (!conversation) {
        return null;
      }

      if (conversation.sellerId !== userId && conversation.buyerId !== userId) {
        return null;
      }

      return conversation;
    } catch (error) {
      this.logger.error(`Failed to get conversation for socket: ${error}`);
      return null;
    }
  }
}
