// File: src/Overlays/VoiceControlOverlay.jsx
import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMicrophone, faTimes, faBolt, faBrain, 
  faHeartPulse, faDumbbell, faPersonRunning, faVolumeHigh,
  faCheckCircle, faExclamationTriangle, faExclamation
} from '@fortawesome/free-solid-svg-icons';
import '../css/VoiceControlOverlay.css';
import { useVoiceController } from '../hooks/useVoiceController';

// Fallback functions that do nothing but prevent crashes
const noopFunction = () => {};
const defaultHookReturn = {
  isListening: false,
  isSpeaking: false,
  isStreaming: false,
  voiceError: null,
  dialogueHistory: [],
  analysisData: null,
  startListening: noopFunction,
  toggleWakeWord: noopFunction,
  wakeEnabled: false,
  speak: noopFunction,
  processViaLLM: noopFunction
};

export default function VoiceControlOverlay({ counts = {}, detection = null, heartRate = null, onCommandProcessed = noopFunction }) {
  const [open, setOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [hookError, setHookError] = useState(null);
  const panelRef = useRef(null);
  
  // Ensure counts has default values to prevent undefined errors
  const safeCount = {
    pushups: counts?.pushups || 0,
    situps: counts?.situps || 0,
    ...counts
  };

  // Wrap the hook in a try-catch to handle initialization errors
  let voiceControllerReturn = defaultHookReturn;
  try {
    voiceControllerReturn = useVoiceController({ 
      counts: safeCount, 
      detection, 
      heartRate, 
      onCommandProcessed 
    }) || defaultHookReturn;
  } catch (error) {
    console.error("Error initializing voice controller:", error);
    setHookError(error?.message || "Failed to initialize voice controller");
  }

  // Safely destructure with defaults to prevent accessing null/undefined
  const {
    isListening = false, 
    isSpeaking = false, 
    isStreaming = false,
    voiceError = null, 
    dialogueHistory = [], 
    analysisData = null,
    startListening = noopFunction, 
    toggleWakeWord = noopFunction, 
    wakeEnabled = false, 
    speak = noopFunction, 
    processViaLLM = noopFunction
  } = voiceControllerReturn;

  // Show status messages when things change
  useEffect(() => {
    if (isListening) {
      setStatusMessage("Listening...");
    } else if (isSpeaking) {
      setStatusMessage("Coach is speaking...");
    } else if (isStreaming) {
      setStatusMessage("Coach is thinking...");
    } else {
      setStatusMessage("");
    }
  }, [isListening, isSpeaking, isStreaming]);

  // Close on outside click
  useEffect(() => {
    function onClick(e) {
      if (open && panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);
  
  // Proactive reminders when panel is open and we haven't spoken in a while
  useEffect(() => {
    // Skip if there's an error or if speak function is not available
    if (hookError || !speak || typeof speak !== 'function') return;

    let reminderTimer;
    
    if (open && !isListening && !isSpeaking && !isStreaming) {
      // After 30 seconds of inactivity, coach offers help
      reminderTimer = setTimeout(() => {
        try {
          speak("Need any help with your workout? I'm here to coach you.");
        } catch (error) {
          console.error("Error in reminder speak function:", error);
        }
      }, 30000);
    }
    
    return () => {
      clearTimeout(reminderTimer);
    };
  }, [open, isListening, isSpeaking, isStreaming, speak, hookError]);

  // Quick commands for common workout questions
  const quickCommands = [
    { text: "How's my form?", icon: faPersonRunning },
    { text: "Count my reps", icon: faDumbbell },
    { text: "Heart rate check", icon: faHeartPulse },
    { text: "Motivate me", icon: faVolumeHigh }
  ];

  const handleQuickCommand = (command) => {
    // Check if function exists before calling
    if (processViaLLM && typeof processViaLLM === 'function') {
      try {
        processViaLLM(command);
      } catch (error) {
        console.error("Error processing command:", error);
        setStatusMessage("Failed to process command");
      }
    }
  };

  // Safe version of startListening with error handling
  const safeStartListening = () => {
    if (!startListening || typeof startListening !== 'function') return;
    
    try {
      startListening();
    } catch (error) {
      console.error("Error starting listening:", error);
      setStatusMessage("Failed to start listening");
    }
  };

  // Safe version of toggleWakeWord with error handling
  const safeToggleWakeWord = () => {
    if (!toggleWakeWord || typeof toggleWakeWord !== 'function') return;
    
    try {
      toggleWakeWord();
    } catch (error) {
      console.error("Error toggling wake word:", error);
      setStatusMessage("Failed to toggle wake word");
    }
  };

  return (
    <div className="voice-overlay-container">
      <button
        className={`voice-toggle ${open ? 'active' : ''} ${wakeEnabled ? 'wake-active' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Voice Coach"
      >
        <FontAwesomeIcon icon={faBrain} />
      </button>

      {open && (
        <div className="voice-panel" ref={panelRef}>
          <header className="voice-header">
            <h4>Workout Coach</h4>
            <button className="close-btn" onClick={() => setOpen(false)}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </header>

          {/* Display hook error if it exists */}
          {hookError && (
            <div className="voice-error critical-error">
              <FontAwesomeIcon icon={faExclamationTriangle} />
              <span>Voice coach unavailable: {hookError}</span>
              <div className="error-tip">
                Try refreshing the app or check your browser permissions.
              </div>
            </div>
          )}

          {!hookError && (
            <>
              <div className="voice-stats">
                <div className="stat-item">
                  <strong>Push-ups:</strong> {safeCount.pushups}
                </div>
                <div className="stat-item">
                  <strong>Sit-ups:</strong> {safeCount.situps}
                </div>
                <div className="stat-item">
                  <strong>BPM:</strong> {heartRate || '--'}
                </div>
                {analysisData && (
                  <div className="form-quality">
                    <strong>Form:</strong> 
                    <span className={`quality-${(analysisData.formQuality || '').replace(/\s+/g, '-')}`}>
                      {analysisData.formQuality}
                      {analysisData.formQuality === 'good' && (
                        <FontAwesomeIcon icon={faCheckCircle} className="quality-icon" />
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="voice-controls">
                <button
                  className={`mic-btn ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''} ${isStreaming ? 'streaming' : ''}`}
                  onClick={safeStartListening}
                  disabled={isListening || isSpeaking || isStreaming}
                >
                  <FontAwesomeIcon icon={faMicrophone} />
                  {statusMessage || "Talk to Coach"}
                </button>
                <button
                  className={`wake-btn ${wakeEnabled ? 'on' : ''}`}
                  onClick={safeToggleWakeWord}
                  title={wakeEnabled ? "Wake Word On ('Hey Coach')" : "Wake Word Off"}
                >
                  <FontAwesomeIcon icon={faBolt} />
                  {wakeEnabled ? "ON" : "OFF"}
                </button>
              </div>

              {voiceError && (
                <>
                  <div className="voice-error">
                    <FontAwesomeIcon icon={faExclamation} /> {voiceError}
                  </div>
                  <div className="permission-tip">
                    Click the lock icon in your address bar and allow Microphone access.
                  </div>
                </>
              )}

              <div className="quick-commands">
                {quickCommands.map((cmd, idx) => (
                  <button 
                    key={idx} 
                    className="quick-cmd-btn"
                    onClick={() => handleQuickCommand(cmd.text)}
                    disabled={isListening || isSpeaking || isStreaming}
                  >
                    <FontAwesomeIcon icon={cmd.icon} />
                    <span>{cmd.text}</span>
                  </button>
                ))}
              </div>

              <div className="transcript">
                {dialogueHistory && Array.isArray(dialogueHistory) ? 
                  dialogueHistory
                    .filter(m => m && m.role !== 'system')
                    .map((m, i) => (
                      <div key={i} className={`line ${m.role || ''}`}>
                        <strong>{m.role === 'user' ? 'You:' : 'Coach:'}</strong> {m.content || ''}
                      </div>
                    ))
                  : <div className="empty-transcript">No conversation history</div>
                }
              </div>
              
              {analysisData && analysisData.suggestions && Array.isArray(analysisData.suggestions) && analysisData.suggestions.length > 0 && (
                <div className="form-suggestions">
                  <h5>Form Tips:</h5>
                  <ul>
                    {analysisData.suggestions.map((tip, i) => (
                      <li key={i}>{tip || ''}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}