import React from 'react';
import './App.css';
import ExpandableOverlayMenu from './ExpandableOverlayMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCrosshairs,
  faClipboardList,
  faHeartbeat,
  faMusic,
  faBrain
} from '@fortawesome/free-solid-svg-icons';

function App() {
  const handleMenuItemClick = (item) => {
    console.log(`Clicked on ${item}`);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Workout Tracker</h1>
        
        <div style={{ position: 'relative', width: '100%', height: '400px', border: '1px solid #ccc' }}>
          {/* Demo of the ExpandableOverlayMenu with icons */}
          <ExpandableOverlayMenu>
            <button 
              className="overlay-menu-item detection" 
              onClick={() => handleMenuItemClick('Detection')}
              icon={<FontAwesomeIcon icon={faCrosshairs} />}
            >
              Detection
            </button>
            
            <button 
              className="overlay-menu-item plan" 
              onClick={() => handleMenuItemClick('Exercise Plan')}
              icon={<FontAwesomeIcon icon={faClipboardList} />}
            >
              Exercise Plan
            </button>
            
            <button 
              className="overlay-menu-item health" 
              onClick={() => handleMenuItemClick('Health')}
              icon={<FontAwesomeIcon icon={faHeartbeat} />}
            >
              Health
            </button>
            
            <button 
              className="overlay-menu-item music" 
              onClick={() => handleMenuItemClick('Music')}
              icon={<FontAwesomeIcon icon={faMusic} />}
            >
              Music
            </button>
            
            <button 
              className="overlay-menu-item voice" 
              onClick={() => handleMenuItemClick('Voice Assist')}
              icon={<FontAwesomeIcon icon={faBrain} />}
            >
              Voice Assist
            </button>
          </ExpandableOverlayMenu>
        </div>
      </header>
    </div>
  );
}

export default App;
