import { createRoot } from 'react-dom/client';
import Settings from './Settings';

const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');
createRoot(root).render(<Settings />);
