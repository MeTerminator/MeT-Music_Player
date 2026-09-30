import { createRoot } from 'react-dom/client';
import Player from './features/player/Player';
import { PlayerProvider } from './features/player/context/PlayerProvider';
import './app/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');
createRoot(root).render(<PlayerProvider><Player /></PlayerProvider>);
