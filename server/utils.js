// Function to validate required environment variables
const validateEnvVars = () => {
  if (!process.env.CLIENT_URL) {
    throw new Error('CLIENT_URL environment variable is not set');
  }
  if (!process.env.PORT) {
    throw new Error('PORT environment variable is not set');
  }
};

// Function to set up socket event handlers
const setupSocketHandlers = (socket, io, maps) => {
  const {
    emailSocketMap,
    socketEmailMap,
    roomCountMap,
    userRoomMap,
    activeEmailsSet,
    cleanupUserData,
    incrementRoomCount,
  } = maps;

  // Handle request to join a room
  socket.on('req-JoinRoom', (data) => {
    try {
      const { roomId, EmailId } = data;

      if (activeEmailsSet.has(EmailId)) {
        io.to(socket.id).emit('notify', {
          message: 'This Username is already in use , Try new one!!',
          type: 'error',
        });
        return;
      }

      const currentCount = roomCountMap.get(roomId) || 0;
      if (currentCount >= 2) {
        io.to(socket.id).emit('notify', {
          message: 'Room is already full',
          type: 'error',
        });
        return;
      }

      incrementRoomCount(roomId);
      activeEmailsSet.add(EmailId);
      emailSocketMap.set(EmailId, socket.id);
      socketEmailMap.set(socket.id, EmailId);
      userRoomMap.set(EmailId, roomId);

      socket.join(roomId);
      console.log('User ', EmailId, ' joined room:', roomId);
      io.to(roomId).emit('new-userJoined', { newUserEmail: EmailId });
      io.to(socket.id).emit('acc-JoinedRoom', { MeEmail: EmailId, roomId });
    } catch (error) {
      console.error('Error during req-JoinRoom:', error);
    }
  });

  // Handle SDP offer for a call
  socket.on('call-user-sdp', (data) => {
    try {
      const { emailId, sdpOffer } = data;
      const fromEmail = socketEmailMap.get(socket.id);

      io.to(emailSocketMap.get(emailId)).emit('incoming-call-sdp', {
        fromEmail,
        sdpOffer,
      });
    } catch (error) {
      console.error('Error during call-user-sdp:', error);
    }
  });

  // Handle SDP answer for a call
  socket.on('call-accepted-sdp', (data) => {
    try {
      const { toEmail, ans } = data;
      const fromEmail = socketEmailMap.get(socket.id);
      io.to(emailSocketMap.get(toEmail)).emit('call-accepted-ans-sdp', {
        fromEmail,
        ans,
      });
    } catch (error) {
      console.error('Error during call-accepted-sdp:', error);
    }
  });

  // Handle negotiation needed event
  socket.on('peer-nego-needed', (data) => {
    try {
      const { toEmail, offer } = data;
      io.to(emailSocketMap.get(toEmail)).emit('peer-nego-needed', {
        fromSocketId: socket.id,
        offer,
      });
    } catch (error) {
      console.error('Error during peer-nego-needed:', error);
    }
  });

  // Handle negotiation done event
  socket.on('peer-nego-done', (data) => {
    try {
      const { toSocketId, ans } = data;
      io.to(toSocketId).emit('peer-nego-final', {
        fromSocketId: socket.id,
        ans,
      });
    } catch (error) {
      console.error('Error during peer-nego-done:', error);
    }
  });

  // Handle request to send streams
  socket.on('send-your-streams', (data) => {
    try {
      const { toEmail } = data;
      io.to(emailSocketMap.get(toEmail)).emit('send-your-stream-remote', {
        fromEmail: toEmail,
      });
    } catch (error) {
      console.error('Error during send-your-streams:', error);
    }
  });

  // Handle ICE candidates
  socket.on('ice-candidates', (data) => {
    try {
      const { candidates, toEmail } = data;
      io.to(emailSocketMap.get(toEmail)).emit('new-ice-candidates', {
        candidates,
      });
    } catch (error) {
      console.error('Error during ice-candidates:', error);
    }
  });

  // Handle user disconnection
  socket.on('user-disconnected', (data) => {
    try {
      const { roomId, leftEmail } = data;
      if (leftEmail) {
        const leftSocketId = emailSocketMap.get(leftEmail);
        cleanupUserData(leftSocketId, leftEmail);

        if (leftSocketId) {
          io.sockets.sockets.get(leftSocketId)?.disconnect(true);
        }
        io.to(roomId).emit('user-disconnected', { roomId, leftEmail });
      }
    } catch (error) {
      console.error('Error during user-disconnected:', error);
    }
  });

  // Handle toggle event
  socket.on('toggle', (data) => {
    try {
      const { toEmail, type, value } = data;
      io.to(emailSocketMap.get(toEmail)).emit('toggle-remote', {
        type,
        value,
      });
    } catch (error) {
      console.error('Error during toggle:', error);
    }
  });
};

module.exports = { validateEnvVars, setupSocketHandlers };
