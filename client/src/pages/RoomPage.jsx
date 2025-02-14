import { useEffect, useCallback, useState, useRef, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import peer from '../services/PeerService';
import './RoomPage.css';
import { MeContext } from '../contexts/MeContext';
import { Video, Mic, PhoneOff, VideoOff, MicOff } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

const RoomPage = () => {
  const { socket } = useSocket();

  const { me } = useContext(MeContext);
  const polite = useRef(true);
  const makingOffer = useRef(false);
  const ignoreOffer = useRef(false);

  const [meStream, setMeStream] = useState(null);

  const [remoteEmailId, setRemoteEmailId] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const [isVideo, setIsVideo] = useState(true);
  const [isMic, setIsMic] = useState(true);

  const navigate = useNavigate();

  const { id } = useParams();

  const meVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const handlegetUserMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setMeStream(stream);
    meVideoRef.current.srcObject = stream;

    for (const track of stream.getTracks()) {
      peer.peer.addTrack(track, stream);
    }
  }, []);

  const handleNewUserJoin = useCallback(
    async (data) => {
      polite.current = false;

      const { newUserEmail } = data;
      const sdpOffer = await peer.createOfferSdp();

      socket.emit('call-user-sdp', { emailId: newUserEmail, sdpOffer });
      setRemoteEmailId(newUserEmail);
    },
    [socket]
  );

  const handleIncomingSDPCall = useCallback(
    async (data) => {
      const { fromEmail, sdpOffer } = data;
      const ans = await peer.createAnswerSdp(sdpOffer);

      socket.emit('call-accepted-sdp', { toEmail: fromEmail, ans });
      setRemoteEmailId(fromEmail);
    },
    [socket]
  );

  const handleAcceptedSDPCall = useCallback(async (data) => {
    const { ans } = data;

    await peer.setAnswerAsRemote(ans);
  }, []);

  const handleTracks = useCallback((ev) => {
    setRemoteStream(ev.streams[0]);
    remoteVideoRef.current.srcObject = ev.streams[0];
  }, []);

  const handleNegoNeeded = useCallback(async () => {
    try {
      makingOffer.current = true;
      await peer.peer.setLocalDescription();
      socket.emit('peer-nego-needed', {
        toEmail: remoteEmailId,
        offer: peer.peer.localDescription,
      });
    } catch (err) {
      console.log('Error while Nego0:', err);
    } finally {
      makingOffer.current = false;
    }
  }, [remoteEmailId, socket]);

  const handleNegoIncoming = useCallback(
    async (data) => {
      const { fromSocketId, offer } = data;
      try {
        const collosion =
          makingOffer.current || peer.peer.signalingState !== 'stable';

        ignoreOffer.current = !polite.current && collosion;
        if (ignoreOffer.current) {
          return;
        }

        const ans = await peer.createAnswerSdp(offer);
        socket.emit('peer-nego-done', { toSocketId: fromSocketId, ans });
      } catch (err) {
        console.log('Error1:', err);
      }
    },
    [socket]
  );

  const handleNegoFinal = useCallback(async (data) => {
    const { ans } = data;
    await peer.setAnswerAsRemote(ans);
  }, []);

  const handleNewICECandidates = useCallback(async (data) => {
    const { candidates } = data;
    if (peer.peer.remoteDescription) {
      await peer.peer.addIceCandidate(candidates);
    }
  }, []);

  const handleOnIceCandidate = useCallback(
    (ev) => {
      if (ev.candidate) {
        socket.emit('ice-candidates', {
          candidates: ev.candidate,
          toEmail: remoteEmailId,
        });
      }
    },
    [remoteEmailId, socket]
  );

  useEffect(() => {
    peer.peer.addEventListener('track', handleTracks);

    return () => {
      peer.peer.removeEventListener('track', handleTracks);
    };
  }, [handleTracks]);

  useEffect(() => {
    peer.peer.addEventListener('icecandidate', handleOnIceCandidate);

    return () => {
      peer.peer.removeEventListener('icecandidate', handleOnIceCandidate);
    };
  }, [handleOnIceCandidate]);

  useEffect(() => {
    peer.peer.addEventListener('negotiationneeded', handleNegoNeeded);

    return () => {
      peer.peer.removeEventListener('negotiationneeded', handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const toggleVideo = async () => {
    if (!meStream) return;

    const videoTrack = meStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideo(videoTrack.enabled);
      socket.emit('toggle', {
        toEmail: remoteEmailId,
        type: 'video',
        value: videoTrack.enabled,
      });
    }
  };

  const toggleMic = async () => {
    if (!meStream) return;

    const audioTrack = meStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMic(audioTrack.enabled);
      socket.emit('toggle', {
        toEmail: remoteEmailId,
        type: 'audio',
        value: audioTrack.enabled,
      });
    }
  };

  const handleHangUp = async () => {
    if (meStream) {
      meStream.getTracks().forEach((track) => track.stop());
    }

    peer.peer.close();

    setMeStream(null);
    setRemoteStream(null);
    setRemoteEmailId(null);

    socket.emit('user-disconnected', { roomId: id, leftEmail: me });

    navigate('/');
  };

  const handleRemoteUserDisconnect = useCallback(async () => {
    toast(`User:${remoteEmailId} left the room!!`);
    setRemoteStream(null);
    setRemoteEmailId(null);
    remoteVideoRef.current.srcObject = null;
  }, [remoteEmailId]);

  const handleToggleRemote = useCallback(
    (data) => {
      if (!remoteStream) {
        return;
      }
      const { type, value } = data;
      if (type === 'video') {
        const videoTrack = remoteStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = value;
        }
      }
      if (type === 'audio') {
        const audioTrack = remoteStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = value;
        }
      }
    },
    [remoteStream]
  );

  useEffect(() => {
    handlegetUserMedia();
  }, [handlegetUserMedia]);

  useEffect(() => {
    socket.on('new-userJoined', handleNewUserJoin);
    socket.on('incoming-call-sdp', handleIncomingSDPCall);
    socket.on('call-accepted-ans-sdp', handleAcceptedSDPCall);
    socket.on('peer-nego-needed', handleNegoIncoming);
    socket.on('peer-nego-done', handleNegoFinal);
    socket.on('new-ice-candidates', handleNewICECandidates);
    socket.on('user-disconnected', handleRemoteUserDisconnect);
    socket.on('toggle-remote', handleToggleRemote);

    return () => {
      socket.off('new-userJoined', handleNewUserJoin);
      socket.off('incoming-call-sdp', handleIncomingSDPCall);
      socket.off('call-accepted-ans-sdp', handleAcceptedSDPCall);
      socket.off('peer-nego-needed', handleNegoIncoming);
      socket.off('peer-nego-done', handleNegoFinal);
      socket.off('new-ice-candidates', handleNewICECandidates);
      socket.off('user-disconnected', handleRemoteUserDisconnect);
      socket.off('toggle-remote', handleToggleRemote);
    };
  }, [
    handleAcceptedSDPCall,
    handleIncomingSDPCall,
    handleNegoFinal,
    handleNegoIncoming,
    handleNewICECandidates,
    handleNewUserJoin,
    handleRemoteUserDisconnect,
    handleToggleRemote,
    socket,
  ]);

  return (
    <div className="room-container">
      <div className="room-header">
        <h2>Room ID: {id}</h2>
      </div>

      <div className="video-grid">
        <div className="video-container">
          <video
            ref={meVideoRef}
            alt="Video placeholder"
            className="video-placeholder"
            autoPlay
          />
          <div className="user-name">{me}</div>
        </div>

        <div className="video-container">
          <video
            ref={remoteVideoRef}
            alt="Video placeholder"
            className="video-placeholder"
            autoPlay
          />
          <div className="user-name">{remoteEmailId}</div>
        </div>
      </div>

      <div className="controls-container">
        <button className="control-button" onClick={toggleVideo}>
          {isVideo ? (
            <Video size={24} strokeWidth={2} />
          ) : (
            <VideoOff size={24} strokeWidth={2} />
          )}
        </button>
        <button className="control-button" onClick={toggleMic}>
          {isMic ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
        <button className="control-button hangup" onClick={handleHangUp}>
          <PhoneOff size={24} />
        </button>
      </div>

      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
    </div>
  );
};

export default RoomPage;
