const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');
const { Eureka } = require('eureka-js-client');

const app = express();
const PORT = 9093;
const ip = '192.168.31.154';

const server = http.createServer(app);

const io = socketIO(server, {
  cors: { origin: '*' },
});

app.use(bodyParser.json());

/**
 * ============================
 * SIMPLE LOGGER
 * ============================
 */
const log = {
  info: (msg, meta = {}) =>
    console.log(`[INFO ] ${new Date().toISOString()} ${msg}`, meta),

  warn: (msg, meta = {}) =>
    console.warn(`[WARN ] ${new Date().toISOString()} ${msg}`, meta),

  error: (msg, meta = {}) =>
    console.error(`[ERROR] ${new Date().toISOString()} ${msg}`, meta),

  debug: (msg, meta = {}) => {
    if (process.env.DEBUG === 'true') {
      console.debug(`[DEBUG] ${new Date().toISOString()} ${msg}`, meta);
    }
  },
};

/**
 * ============================
 * HTTP REQUEST LOGGING
 * ============================
 */
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    log.info('HTTP request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });

  next();
});

/**
 * Map<userId, socketId>
 */
const userSocketMap = new Map();

/**
 * ============================
 * OFFLINE MESSAGE API CALL
 * ============================
 */
async function saveOfflineMessage({ message }) {
  log.info('Saving offline message', {
    sender: message.sender,
    receiver: message.receiver,
  });

  try {
    const response = await fetch(`http://${ip}/chat/api/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: message.sender,
        recipient: message.receiver,
        content: JSON.stringify(message),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error('Failed to save offline message', { errorText });
    } else {
      log.info('Offline message saved', {
        receiver: message.receiver,
      });
    }
  } catch (err) {
    log.error('Offline message API error', {
      error: err.message,
    });
  }
}

/**
 * ============================
 * SOCKET.IO HANDLERS
 * ============================
 */
io.on('connection', (socket) => {
  log.info('Socket connected', { socketId: socket.id });

  /**
   * Register user
   */
  socket.on('register', async (userId) => {
    const key = String(userId);
    userSocketMap.set(key, socket.id);

    log.info('User registered', {
      userId: key,
      socketId: socket.id,
      onlineUsers: userSocketMap.size,
    });

    /**
     * Fetch pending offline messages
     */
    try {
      const res = await fetch(
        `http://${ip}/chat/api/messages/pending/${key}`
      );

      if (res.ok) {
        const messages = await res.json();
        
        socket.emit('pending_messages', {message:messages});
        

        log.info('Offline messages delivered', {
          userId: key,
          count: messages.length,
        });
      } else {
        log.warn('No offline messages', { userId: key });
      }
    } catch (err) {
      log.error('Failed to fetch offline messages', {
        userId: key,
        error: err.message,
      });
    }
  });

  /**
   * Private message handler
   */
  socket.on('private_message', async ({ toUserId, message }) => {
    log.info('Private message received', {
      fromSocketId: socket.id,
      toUserId,
    });

    if (!toUserId || !message) {
      log.warn('Invalid private message payload', {
        socketId: socket.id,
      });
      return;
    }

    const targetSocketId = userSocketMap.get(String(toUserId));

    /**
     * User OFFLINE → save message
     */
    if (!targetSocketId) {
      log.info('User offline, persisting message', {
        toUserId,
      });

      await saveOfflineMessage({ message });
      return;
    }

    /**
     * User ONLINE → send message
     */
    io.to(targetSocketId).emit('private_message', {
      from: socket.id,
      message,
      timestamp: Date.now(),
    });

    log.info('Message delivered', {
      fromSocketId: socket.id,
      toSocketId: targetSocketId,
    });
  });

  /**
   * Notifications
   */
  socket.on('notification', ({ toUserId, message }) => {
    const targetSocketId = userSocketMap.get(String(toUserId));

    log.info('Notification event', {
      toUserId,
      delivered: !!targetSocketId,
    });

    if (targetSocketId) {
      io.to(targetSocketId).emit('notification', {
        from: socket.id,
        message,
      });
    }
  });

  /**
   * Cleanup on disconnect
   */
  socket.on('disconnect', (reason) => {
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);

        log.warn('User disconnected', {
          userId,
          socketId,
          reason,
          onlineUsers: userSocketMap.size,
        });
        break;
      }
    }
  });
});

/**
 * ============================
 * HTTP ENDPOINTS
 * ============================
 */
app.post('/send-notification', (req, res) => {
  const { toUserId, notificationTitle, notificationMessage } = req.body;

  if (!toUserId || !notificationMessage) {
    log.warn('Invalid notification request', req.body);
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const targetSocketId = userSocketMap.get(String(toUserId));

  if (targetSocketId) {
    io.to(targetSocketId).emit('notification', {
      from: 'server',
      notificationTitle,
      notificationMessage,
    });

    log.info('Notification sent', { toUserId });
    return res.json({ success: true });
  }

  log.warn('Notification target offline', { toUserId });
  res.status(404).json({ error: 'User not connected' });
});

/**
 * Health & Info
 */
app.get('/health', (_, res) => res.json({ status: 'UP' }));
app.get('/info', (_, res) =>
  res.json({ service: 'FZ-MESSAGING-SERVICE', version: '1.0.0' })
);

/**
 * ============================
 * EUREKA REGISTRATION
 * ============================
 */
const eurekaClient = new Eureka({
  instance: {
    app: 'FZ-MESSAGING-SERVICE',
    instanceId: `FZ-MESSAGING-SERVICE:${PORT}`,
    hostName: ip,
    ipAddr: ip,
    port: { $: PORT, '@enabled': true },
    statusPageUrl: `http://${ip}:${PORT}/info`,
    healthCheckUrl: `http://${ip}:${PORT}/health`,
    vipAddress: 'FZ-MESSAGING-SERVICE',
    dataCenterInfo: {
      '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
      name: 'MyOwn',
    },
  },
  eureka: {
    host: '192.168.31.154',
    port: 80,
    servicePath: '/eureka/eureka/apps/',
  },
});

eurekaClient.start((error) => {
  if (error) {
    log.error('Eureka registration failed', { error });
  } else {
    log.info('Eureka registration successful');
  }
});

/**
 * ============================
 * START SERVER
 * ============================
 */
server.listen(PORT, () => {
  log.info('Server started', {
    url: `http://${ip}:${PORT}`,
  });
});
