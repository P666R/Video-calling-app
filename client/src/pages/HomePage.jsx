import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { MeContext } from '../contexts/MeContext';
import { Toaster, toast } from 'react-hot-toast';
import './HomePage.css';

const HomePage = () => {
  const { socket } = useSocket();

  const { setMe } = useContext(MeContext);

  const navigate = useNavigate();

  const [emailId, setEmailId] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleNotification = (data) => {
    const { message, type } = data;
    if (type === 'error') {
      toast.error(message);
    }
    if (type === 'success') {
      toast.success(message);
    }
  };

  const handleEmailChange = (e) => {
    setEmailId(e.target.value);
  };

  const handleRoomIdChange = (e) => {
    setRoomId(e.target.value);
  };

  const handleJoinButton = (e) => {
    e.preventDefault();
    if (!emailId || !roomId) {
      return;
    }
    socket.emit('req-JoinRoom', { roomId, emailId });
  };

  const handleRoomJoin = useCallback(
    (data) => {
      const { MeEmail, roomId } = data;
      setMe(MeEmail);
      navigate(`/room/${roomId}`);
    },
    [navigate, setMe]
  );

  useEffect(() => {
    socket.on('acc-JoinedRoom', handleRoomJoin);
    socket.on('notify', handleNotification);

    return () => {
      socket.off('acc-JoinedRoom', handleRoomJoin);
      socket.off('notify', handleNotification);
    };
  }, [handleRoomJoin, socket]);

  return (
    <div className="form-container">
      <div className="form-header">
        <h1>OneOnOne</h1>
        <p>Enter your details to join a video call</p>
      </div>

      <form className="video-call-form" onSubmit={handleJoinButton}>
        <div className="input-group">
          <label htmlFor="username">Username</label>
          <div className="input-wrapper">
            <input
              type="text"
              id="username"
              placeholder="Enter your name"
              value={emailId}
              onChange={handleEmailChange}
            />
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="roomId">Room ID</label>
          <div className="input-wrapper">
            <input
              type="text"
              id="roomId"
              placeholder="Enter room ID"
              value={roomId}
              onChange={handleRoomIdChange}
            />
          </div>
        </div>

        <button type="submit" className="join-button">
          Join Room
        </button>
      </form>
      <div className="footer-c">
        <p className="c-text">
          Crafted with <span className="heart-icon">❤</span> by{' '}
          <a href="#" className="d-name">
            Parth Sadariya
          </a>
        </p>
      </div>
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
    </div>
  );
};

export default HomePage;
