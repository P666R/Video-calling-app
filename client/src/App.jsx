import { Route, Routes } from 'react-router-dom';
import RoomPage from './pages/RoomPage';
import HomePage from './pages/HomePage';
import { SocketProvider } from './contexts/SocketContext';
import { MeContextProvider } from './contexts/MeContext';

function App() {
  return (
    <SocketProvider>
      <MeContextProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:id" element={<RoomPage />} />
        </Routes>
      </MeContextProvider>
    </SocketProvider>
  );
}

export default App;
