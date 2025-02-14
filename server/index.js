const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const { validateEnvVars, setupSocketHandlers } = require('./utils');

dotenv.config();

validateEnvVars();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

app.use(express.json());

const PORT = process.env.PORT || 3000;

// Maps to keep track of user and room data
const emailSocketMap = new Map();
const socketEmailMap = new Map();
const roomCountMap = new Map();
const userRoomMap = new Map();
const activeEmailsSet = new Set();

// Function to clean up user data when they disconnect
const cleanupUserData = (socketId, emailId) => {
  if (emailId) {
    const roomId = userRoomMap.get(emailId);
    if (roomId) {
      decrementRoomCount(roomId);
      userRoomMap.delete(emailId);
    }
    emailSocketMap.delete(emailId);
    activeEmailsSet.delete(emailId);
  }
  if (socketId) {
    socketEmailMap.delete(socketId);
  }
};

// Function to increment the room count
const incrementRoomCount = (roomId) => {
  const currentCount = roomCountMap.get(roomId) || 0;
  roomCountMap.set(roomId, currentCount + 1);
  return currentCount + 1;
};

// Function to decrement the room count
const decrementRoomCount = (roomId) => {
  const currentCount = roomCountMap.get(roomId) || 0;
  if (currentCount <= 1) {
    roomCountMap.delete(roomId);
  } else {
    roomCountMap.set(roomId, currentCount - 1);
  }
  return Math.max(0, currentCount - 1);
};

// Handle new socket connections
io.on('connection', (socket) => {
  console.log('User Connected!! , ID:', socket.id);

  // Handle socket disconnections
  socket.on('disconnect', () => {
    try {
      const emailId = socketEmailMap.get(socket.id);
      if (emailId) {
        cleanupUserData(socket.id, emailId);
      }
      console.log('Disconnected!! ,ID:', socket.id);
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  });

  // Setup additional socket event handlers
  setupSocketHandlers(socket, io, {
    emailSocketMap,
    socketEmailMap,
    roomCountMap,
    userRoomMap,
    activeEmailsSet,
    cleanupUserData,
    incrementRoomCount,
    decrementRoomCount,
  });
});

// Start the server
server.listen(PORT, () => {
  console.log('Socket-Server running at PORT:', PORT);
});
