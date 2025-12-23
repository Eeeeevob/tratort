
import React, { useEffect, useRef } from 'react';
import { GameEngine } from './services/GameEngine';

const App: React.FC = () => {
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const engine = new GameEngine();
        engine.init().catch(err => {
            console.error("Engine Init Failed:", err);
            // Fallback is handled within GameEngine
        });

        return () => {
            // Cleanup logic if needed
        };
    }, []);

    return null; // All UI is in index.html for simplicity in this specific "single-file" request
};

export default App;
