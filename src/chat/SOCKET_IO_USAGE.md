# Socket.IO Real-Time Chat - Usage Guide

## Overview

Yeh app ab real-time chat support karta hai Socket.IO ke through. Messages instantly deliver hote hain bina page refresh kiye.

## Backend Setup

✅ Already configured - Gateway `/chat` namespace par run ho raha hai.

## Frontend Integration

### 1. Install Socket.IO Client

```bash
npm install socket.io-client
```

### 2. Connect to Socket Server

```typescript
import { io, Socket } from 'socket.io-client';

// Connect to chat namespace
const socket: Socket = io('http://localhost:3000/chat', {
  auth: {
    token: 'YOUR_JWT_TOKEN', // JWT token from login
  },
  // Or pass token in query
  // query: {
  //   token: 'YOUR_JWT_TOKEN'
  // }
});
```

### 3. Socket Events

#### Connection Events

```typescript
// When connected
socket.on('connected', (data) => {
  console.log('Connected:', data);
  // { message: 'Connected to chat server', userId: '...' }
});

// When disconnected
socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Error handling
socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

#### Join a Conversation Room

```typescript
// Join a conversation room
socket.emit('join_room', { roomId: 'conversation-id' });

// Listen for join confirmation
socket.on('joined_room', (data) => {
  console.log('Joined room:', data);
  // { roomId: '...', message: 'Successfully joined room' }
});
```

#### Send Message (Real-Time)

```typescript
// Send message via Socket.IO
socket.emit('send_message', {
  roomId: 'conversation-id',
  message: 'Hello, this is a real-time message!',
});

// Listen for new messages in the room
socket.on('new_message', (messageData) => {
  console.log('New message received:', messageData);
  // {
  //   id: '...',
  //   roomId: '...',
  //   senderId: '...',
  //   message: '...',
  //   createdAt: '...',
  //   sender: { id: '...', name: '...', email: '...' }
  // }
  // Update your UI here
});
```

#### Typing Indicators

```typescript
// Start typing
socket.emit('typing_start', { roomId: 'conversation-id' });

// Stop typing
socket.emit('typing_stop', { roomId: 'conversation-id' });

// Listen for typing events
socket.on('user_typing', (data) => {
  console.log('User typing:', data);
  // {
  //   roomId: '...',
  //   userId: '...',
  //   isTyping: true/false
  // }
  // Show/hide typing indicator
});
```

#### Leave Room

```typescript
socket.emit('leave_room', { roomId: 'conversation-id' });

socket.on('left_room', (data) => {
  console.log('Left room:', data);
});
```

## Complete Example (React/TypeScript)

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  roomId: string;
  senderId: string;
  message: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
  };
}

function ChatComponent({ conversationId, token }: { conversationId: string; token: string }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Connect to socket
    const newSocket = io('http://localhost:3000/chat', {
      auth: { token },
    });

    newSocket.on('connected', () => {
      console.log('Connected to chat');
      // Join the conversation room
      newSocket.emit('join_room', { roomId: conversationId });
    });

    // Listen for new messages
    newSocket.on('new_message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Listen for typing
    newSocket.on('user_typing', (data) => {
      setIsTyping(data.isTyping);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.emit('leave_room', { roomId: conversationId });
      newSocket.disconnect();
    };
  }, [conversationId, token]);

  const sendMessage = (messageText: string) => {
    if (socket) {
      socket.emit('send_message', {
        roomId: conversationId,
        message: messageText,
      });
    }
  };

  const handleTyping = (typing: boolean) => {
    if (socket) {
      if (typing) {
        socket.emit('typing_start', { roomId: conversationId });
      } else {
        socket.emit('typing_stop', { roomId: conversationId });
      }
    }
  };

  return (
    <div>
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id}>
            <strong>{msg.sender.name}:</strong> {msg.message}
          </div>
        ))}
        {isTyping && <div>Someone is typing...</div>}
      </div>
      <input
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            sendMessage(e.currentTarget.value);
            e.currentTarget.value = '';
          }
        }}
        onInput={(e) => handleTyping(e.currentTarget.value.length > 0)}
      />
    </div>
  );
}
```

## API Endpoints (Still Available)

REST APIs bhi available hain agar Socket.IO use nahi karna:

- `POST /chat/conversation` - Create/get conversation
- `POST /chat/message` - Send message (REST)
- `GET /chat/messages/:roomId` - Get messages
- `GET /chat/conversations` - Get all conversations

## Socket.IO Connection URL

- **Development**: `http://localhost:3000/chat`
- **Production**: `https://your-domain.com/chat`

## Notes

1. **Authentication**: JWT token required - pass in `auth.token` ya `query.token`
2. **Rooms**: Har conversation ek room hai - `room_${conversationId}` format mein
3. **Auto-reconnect**: Socket.IO automatically reconnect karta hai agar connection break ho
4. **Fallback**: Agar WebSocket support nahi hai, Socket.IO automatically polling use karega
