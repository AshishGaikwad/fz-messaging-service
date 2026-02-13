# FZ Messaging Service

A real-time messaging service built with Node.js, Express, and Socket.IO following industry-standard MVC architecture.

## Project Structure

```
fz-messaging-service/
├── src/
│   ├── config/              # Configuration files
│   │   ├── environment.js   # Environment variables
│   │   └── eureka.js        # Eureka service registration
│   ├── controllers/         # Request handlers
│   │   ├── expoTokenController.js
│   │   ├── healthController.js
│   │   └── notificationController.js
│   ├── services/            # Business logic
│   │   ├── userService.js
│   │   ├── expoService.js
│   │   └── messageService.js
│   ├── routes/              # API route definitions
│   │   └── index.js
│   ├── socket/              # Socket.IO event handlers
│   │   └── socketHandlers.js
│   ├── middleware/          # Express middleware
│   │   └── requestLogger.js
│   ├── models/              # Data models
│   │   └── User.js
│   ├── utils/               # Utility functions
│   │   └── logger.js
│   └── server.js            # Main server file
├── cert/                    # SSL certificates
├── docker-compose.yaml
├── Dockerfile
├── Jenkinsfile
├── package.json
└── README.md
```

## Features

- **Real-time Messaging**: Socket.IO for real-time communication
- **Offline Message Handling**: Automatic persistence and delivery of offline messages
- **Push Notifications**: Expo push notification integration
- **Service Discovery**: Eureka client registration
- **Health Checks**: Built-in health check endpoints
- **Structured Logging**: Comprehensive logging with multiple levels

## Getting Started

### Prerequisites

- Node.js >= 14.0
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment files:
   ```bash
   cp .env.dev .env.dev  # Configure development
   cp .env.prod .env.prod  # Configure production
   ```

### Running the Service

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run prod
```

**Direct:**
```bash
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Service health status
- `GET /info` - Service information

### Tokens
- `POST /register-expo-token` - Register Expo push notification token
  ```json
  {
    "userId": "user123",
    "expoToken": "ExponentPushToken[...]"
  }
  ```

### Notifications
- `POST /send-notification` - Send notification to user
  ```json
  {
    "toUserId": "user123",
    "notificationTitle": "Hello",
    "notificationMessage": "Message content"
  }
  ```

## Socket.IO Events

### Client → Server

- `register` - Register user session
  ```javascript
  socket.emit('register', userId);
  ```

- `private_message` - Send private message
  ```javascript
  socket.emit('private_message', {
    toUserId: 'user123',
    message: {
      sender: 'user456',
      text: 'Hello!',
      // additional fields
    }
  });
  ```

- `notification` - Send notification
  ```javascript
  socket.emit('notification', {
    toUserId: 'user123',
    message: 'Notification content'
  });
  ```

### Server → Client

- `pending_messages` - Offline messages for user
- `private_message` - Incoming private message
- `notification` - Incoming notification

## Configuration

Environment variables:
- `PORT` - Server port (default: 9093)
- `NODE_ENV` - Environment (development/production)
- `SERVER_IP` - Server IP address
- `DEBUG` - Enable debug logging (true/false)
- `EUREKA_HOST` - Eureka server host
- `EUREKA_PORT` - Eureka server port
- `EUREKA_SERVICE_PATH` - Eureka service path

## Architecture

### MVC Pattern

- **Models**: Data structures (User, Message)
- **Views**: Socket.IO events and API responses
- **Controllers**: Request handlers and business flow
- **Services**: Core business logic
- **Middleware**: Cross-cutting concerns
- **Utilities**: Helper functions and loggers

### Key Services

1. **UserService**: User session and online status management
2. **MessageService**: Offline message persistence
3. **ExpoService**: Push notification delivery

## Logging

Four log levels available:
- `info` - General information
- `warn` - Warnings
- `error` - Errors
- `debug` - Debug messages (enabled when `DEBUG=true`)

## Development

### Code Organization

- Keep business logic in services
- Use controllers for request handling
- Maintain separation of concerns
- Use models for data structures
- Leverage middleware for cross-cutting concerns

### Best Practices

- Use consistent error handling
- Log important operations
- Validate input in controllers
- Keep functions small and focused
- Use descriptive variable names

## Docker

Build and run with Docker:

```bash
docker build -t fz-messaging-service .
docker-compose up
```

## License

ISC
