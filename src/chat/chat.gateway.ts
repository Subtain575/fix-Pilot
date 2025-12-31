import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake auth or query in a type-safe way
      const auth = client.handshake.auth as { token?: string } | undefined;
      const query = client.handshake.query as { token?: string } | undefined;
      const token = auth?.token ?? query?.token;

      if (!token || typeof token !== 'string') {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      try {
        const payload = this.jwtService.verify<{
          sub?: string;
          userId?: string;
          email?: string;
          role?: string;
        }>(token);
        client.userId = payload.sub ?? payload.userId;

        if (!client.userId) {
          this.logger.warn(`Connection rejected: Invalid token payload`);
          client.disconnect();
          return;
        }
      } catch (error) {
        this.logger.warn(
          `Connection rejected: Invalid token - ${String(error)}`,
        );
        client.disconnect();
        return;
      }

      // Store user connection
      this.connectedUsers.set(client.userId, client.id);

      // Join user to their personal room
      await client.join(`user_${client.userId}`);

      this.logger.log(
        `User connected: ${client.userId} (socket: ${client.id})`,
      );

      // Notify user that they're connected
      client.emit('connected', {
        message: 'Connected to chat server',
        userId: client.userId,
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      this.logger.log(
        `User disconnected: ${client.userId} (socket: ${client.id})`,
      );
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    try {
      // Verify user has access to this conversation
      const conversation = await this.chatService.getConversationForSocket(
        data.conversationId,
        client.userId,
      );

      if (!conversation) {
        client.emit('error', { message: 'Conversation not found' });
        return;
      }

      // Join the room
      await client.join(`room_${data.conversationId}`);

      // Get room size for debugging (safe access)
      let roomSize = 0;
      try {
        const adapter = this.server.sockets?.adapter;
        if (adapter && adapter.rooms) {
          const room = adapter.rooms.get(`room_${data.conversationId}`);
          roomSize = room ? room.size : 0;
        }
      } catch (error) {
        this.logger.warn(`Could not get room size: ${error}`);
      }

      this.logger.log(
        `User ${client.userId} joined conversation: ${data.conversationId}. Room size: ${roomSize}`,
      );

      client.emit('joined_room', {
        conversationId: data.conversationId,
        message: 'Successfully joined conversation',
        roomSize: roomSize,
      });
    } catch (error) {
      this.logger.error(`Join room error: ${error}`);
      client.emit('error', { message: 'Failed to join conversation' });
    }
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) {
      return;
    }

    await client.leave(`room_${data.conversationId}`);
    this.logger.log(
      `User ${client.userId} left conversation: ${data.conversationId}`,
    );

    client.emit('left_room', {
      conversationId: data.conversationId,
      message: 'Successfully left conversation',
    });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() sendMessageDto: SendMessageDto,
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    try {
      // Save message to database
      const result = await this.chatService.sendMessage(
        client.userId,
        sendMessageDto,
      );

      if (result.success && result.data) {
        const messageData = result.data;

        // Get room info for debugging (safe access)
        let roomSize = 0;
        let roomMembers: string[] = [];
        try {
          const adapter = this.server.sockets?.adapter;
          if (adapter && adapter.rooms) {
            const room = adapter.rooms.get(
              `room_${sendMessageDto.conversationId}`,
            );
            roomSize = room ? room.size : 0;
            roomMembers = room ? Array.from(room) : [];
          }
        } catch (error) {
          this.logger.warn(`Could not get room info: ${error}`);
        }

        this.logger.log(
          `Message sent in conversation ${sendMessageDto.conversationId} by user ${client.userId}. Room size: ${roomSize}, Members: ${roomMembers.join(', ')}`,
        );

        // Emit to all users in the room (including sender)
        this.server
          .to(`room_${sendMessageDto.conversationId}`)
          .emit('new_message', {
            id: messageData.id,
            conversationId: sendMessageDto.conversationId,
            senderId: messageData.senderId,
            message: messageData.message,
            fileUrl: messageData.fileUrl,
            fileType: messageData.fileType,
            createdAt: messageData.createdAt,
            sender: messageData.sender,
          });

        this.logger.log(
          `Emitted new_message event to room_${sendMessageDto.conversationId}`,
        );
      }
    } catch (error) {
      this.logger.error(`Send message error: ${error}`);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) {
      return;
    }

    // Notify others in the room (except sender)
    client.to(`room_${data.conversationId}`).emit('user_typing', {
      conversationId: data.conversationId,
      userId: client.userId,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) {
      return;
    }

    // Notify others in the room (except sender)
    client.to(`room_${data.conversationId}`).emit('user_typing', {
      conversationId: data.conversationId,
      userId: client.userId,
      isTyping: false,
    });
  }

  // Helper method to emit message to specific user
  emitToUser(userId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  // Helper method to emit to room
  emitToRoom(conversationId: string, event: string, data: any) {
    this.server.to(`room_${conversationId}`).emit(event, data);
  }
}
