const express = require('express');
const https = require('https');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');
const { Eureka } = require('eureka-js-client');
const os = require('os');
const fs = require('fs');

const app = express();
const PORT = 9093;

// Get the first non-internal IPv4 address of the host (for Eureka)
const ip = Object.values(os.networkInterfaces())
  .flat()
  .find((iface) => iface.family === 'IPv4' && !iface.internal)?.address || '127.0.0.1';


const options = {
  key: fs.readFileSync('./cert/privkey.pem'),         // private key
  cert: fs.readFileSync('./cert/cert.pem')        // public certificate
};

const server = https.createServer(options,app);
const io = socketIO(server, {
  cors: {
    origin: '*',
  },
});

app.use(bodyParser.json());

const userSocketMap = new Map();

// === WebSocket Handlers ===
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Register socket
  socket.on('register', (userId) => {
    const key = String(userId);
    userSocketMap.set(key, socket.id);
    console.log(`User ${key} registered with socket ${socket.id}`);
  });

  // Private message
  socket.on('private_message', ({ toUserId, message }) => {
    const targetSocketId = userSocketMap.get(String(toUserId));
    if (targetSocketId) {
      io.to(targetSocketId).emit('private_message', {
        from: socket.id,
        message,
      });
    }
  });

  // Notifications
  socket.on('notification', ({ toUserId, message }) => {
    const targetSocketId = userSocketMap.get(String(toUserId));
    if (targetSocketId) {
      io.to(targetSocketId).emit('notification', {
        from: socket.id,
        message,
      });
    }
  });

  // Disconnect cleanup
  socket.on('disconnect', () => {
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

// === HTTP API for Notifications ===
app.post('/send-notification', (req, res) => {
  const { toUserId, notificationTitle, notificationMessage } = req.body;

  if (!toUserId || !notificationMessage) {
    return res.status(400).json({ error: 'toUserId and notificationMessage are required' });
  }

  const targetSocketId = userSocketMap.get(String(toUserId));
  if (targetSocketId) {
    io.to(targetSocketId).emit('notification', {
      from: 'server',
      notificationTitle,
      notificationMessage,
    });
    return res.status(200).json({ success: true });
  } else {
    return res.status(404).json({ error: 'User not connected' });
  }
});

// === Health Checks ===
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

app.get('/info', (req, res) => {
  res.status(200).json({ service: 'FZ-MESSAGING-SERVICE', version: '1.0.0' });
});

// === Eureka Client ===
const eurekaClient = new Eureka({
  instance: {
    app: 'FZ-MESSAGING-SERVICE',
    instanceId: `FZ-MESSAGING-SERVICE:${PORT}`,
    hostName: ip,
    ipAddr: ip,
    port: {
      '$': PORT,
      '@enabled': true,
    },
    statusPageUrl: `http://${ip}:${PORT}/info`,
    healthCheckUrl: `http://${ip}:${PORT}/health`,
    vipAddress: 'FZ-MESSAGING-SERVICE',
    dataCenterInfo: {
      '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
      name: 'MyOwn',
    },
  },
  eureka: {
    host: '172.17.0.1', // Your Eureka server IP (host.docker.internal or service name in Docker)
    port: 7070,
    servicePath: '/eureka/apps/',
    maxRetries: 10,
    requestRetryDelay: 2000,
  },
});

// Start Eureka registration
eurekaClient.start((error) => {
  if (error) {
    console.error('❌ Eureka registration failed:', error);
  } else {
    console.log('✅ Eureka registration successful');
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://${ip}:${PORT}`);
});
