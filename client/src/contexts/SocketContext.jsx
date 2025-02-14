import { createContext, useContext, useMemo } from 'react';
import { io } from 'socket.io-client';
import PropTypes from 'prop-types';

export const SocketContext = createContext(null);

export const SocketProvider = (props) => {
  console.log(import.meta.env.REACT_APP_BACKEND_URL);
  const socket = useMemo(
    () => io(import.meta.env.VITE_REACT_APP_BACKEND_URL),
    []
  );

  return (
    <SocketContext.Provider value={useMemo(() => ({ socket }), [socket])}>
      {props.children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
