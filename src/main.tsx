import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { startAdminSettingsSync } from './services/adminSettingsSync';

// Load the saved pricing for this environment from the server, and save admin changes back to it
startAdminSettingsSync();

createRoot(document.getElementById('root')!).render(<App />);
