// File: src/hooks/useVoiceController.js
import { useState, useEffect, useRef, useCallback } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSynthesis = window.speechSynthesis;
const DEFAULT_LANGUAGE = 'en-US';
const ACTIVATION_TIMEOUT = 5000;
const WAKE_WORDS = ['hey coach', 'coach', 'hey trainer', 'trainer'];
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export function useVoiceController({ counts, detection, heartRate, onCommandProcessed }) {
  const [isSupported]    = useState(!!SpeechRecognition && !!speechSynthesis);
  const [isListening, setIsListening]  = useState(false);
  const [isSpeaking, setIsSpeaking]    = useState(false);
  const [voiceError, setVoiceError]    = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice]     = useState(null);
  const [wakeEnabled, setWakeEnabled] = useState(false);
  const [dialogueHistory, setDialogueHistory] = useState([
    { role: 'system', content: 'You are an expert fitness coach that provides real-time workout guidance.' }
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);

  const recognitionRef = useRef(null);
  const silenceTimeout = useRef(null);
  const wakeWordListenerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const countsRef      = useRef(counts);
  const detectionRef   = useRef(detection);
  const hrRef          = useRef(heartRate);
  const processViaLLMRef = useRef();

  useEffect(() => { countsRef.current = counts; }, [counts]);
  useEffect(() => { detectionRef.current = detection; }, [detection]);
  useEffect(() => { hrRef.current = heartRate; }, [heartRate]);

  // Define stopListening early to avoid reference issues
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Speech synthesis function - DEFINED FIRST to fix the circular dependency
  const speak = useCallback((text) => {
    if (!isSupported || !text || isSpeaking) return;
    if (isListening) stopListening();
    
    try {
      if (speechSynthesis) {
        speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        if (selectedVoice) {
          utter.voice = selectedVoice;
          utter.lang  = selectedVoice.lang;
        }
        // Adjust voice characteristics for coaching
        utter.rate = 1.05; // Slightly faster than normal
        utter.pitch = 1.1; // Slightly higher pitch for enthusiasm
        utter.volume = 1.0; // Full volume
        
        utter.onstart = () => setIsSpeaking(true);
        utter.onend   = () => setIsSpeaking(false);
        utter.onerror = e => {
          setVoiceError(`Synthesis error: ${e.error}`);
          setIsSpeaking(false);
        };
        speechSynthesis.speak(utter);
      } else {
        console.error('[Voice] Speech synthesis not available');
        setVoiceError('Speech synthesis not supported');
      }
    } catch (e) {
      console.error('[Voice] Speech synthesis error:', e);
      setVoiceError(`Speech synthesis error: ${e.message}`);
    }
  }, [isSupported, isListening, isSpeaking, selectedVoice, stopListening]);

  const startListening = useCallback(() => {
    console.log('[Voice] startListening');
    if (!isSupported || isListening || isSpeaking) return;
    setVoiceError(null);
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        silenceTimeout.current = setTimeout(() => {
          stopListening();
          setVoiceError('No speech detected, try again');
        }, ACTIVATION_TIMEOUT);
      } else {
        console.error("[Voice] Recognition not initialized");
        setVoiceError("Speech recognition not initialized");
      }
    } catch (err) {
      console.error('[Voice] start error', err);
      setVoiceError(`Cannot start recognition: ${err.message}`);
    }
  }, [isSupported, isListening, isSpeaking, stopListening]);

  // Track workout data
  
  const trackExerciseData = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/workout/track`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseType: countsRef.current.pushups > countsRef.current.situps ? 'pushup' : 'situp',
          count: { pushups: countsRef.current.pushups, situps: countsRef.current.situps },
          landmarks: detectionRef.current?.landmarks || [],
          heartRate: hrRef.current
        })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (err) {
      console.error('[Voice] Track error:', err);
      return { success: true, session: { pushUps: countsRef.current.pushups, sitUps: countsRef.current.situps, heartRates: hrRef.current ? [{ bpm: hrRef.current, timestamp: Date.now() }] : [] } };
    }
  }, []);

  // Analysis for workout form - now 'speak' is already defined above
  const runPoseAnalysis = useCallback(async () => {
    if (detectionRef.current?.landmarks?.length) {
      try {
        const resp = await fetch(`${API_BASE}/api/workout/analyze-pose`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ landmarks: detectionRef.current.landmarks, exerciseType: countsRef.current.pushups > countsRef.current.situps ? 'pushup' : 'situp', heartRate: hrRef.current })
        });
        if (resp.ok) {
          const data = await resp.json();
          setAnalysisData(data);
          if (data.suggestions?.length && !isListening && !isSpeaking) {
            speak(`Quick tip: ${data.suggestions.join('. ')}`);
          }
          return data;
        }
      } catch (err) {
        console.error('[Voice] Analysis error:', err);
      }
    }
    return { exerciseType: 'unknown', formQuality: 'good', suggestions: [], timestamp: Date.now() };
  }, [isListening, isSpeaking, speak]);

  // For development - mock AI responses as fallback
  function getMockResponse(query, stats) {
    query = query.toLowerCase();
    
    // Form analysis
    if (query.includes("form") || query.includes("posture") || query.includes("technique")) {
      return "Your form looks good! Keep your back straight and maintain a steady rhythm. Remember to breathe out during the exertion phase.";
    }
    
    // Rep counting
    if (query.includes("count") || query.includes("reps")) {
      const exercise = query.includes("push") ? "push-ups" : "sit-ups";
      const count = exercise === "push-ups" ? stats.pushups : stats.situps;
      return `You've completed ${count} ${exercise} so far. Keep up the great work! I'll count your next reps automatically.`;
    }
    
    // Heart rate
    if (query.includes("heart") || query.includes("bpm") || query.includes("pulse")) {
      if (stats.heartRate) {
        const intensity = stats.heartRate > 140 ? "high-intensity" : stats.heartRate > 120 ? "moderate" : "low-intensity";
        return `Your heart rate is ${stats.heartRate} BPM, which is in the ${intensity} zone. This is perfect for building ${intensity === "high-intensity" ? "anaerobic capacity" : "aerobic endurance"}.`;
      } else {
        return "I don't have heart rate data yet. Connect a heart rate monitor for real-time feedback on your training zones.";
      }
    }
    
    // Motivation
    if (query.includes("motivate") || query.includes("tired") || query.includes("give up")) {
      return "You're doing amazing! Remember why you started - every rep brings you closer to your goals. Your future self will thank you for pushing through today!";
    }
    
    // Music
    if (query.includes("music") || query.includes("song") || query.includes("playlist")) {
      return "I can play an upbeat workout playlist for you. Would you prefer pop, rock, or electronic music to match your workout intensity?";
    }
    
    // Generic responses
    const genericResponses = [
      "You're doing great! Keep pushing yourself, but listen to your body.",
      "Remember to stay hydrated during your workout. Form is more important than speed.",
      "Focus on quality reps rather than quantity. Maintain proper breathing throughout each exercise.",
      "You've got this! I'm monitoring your workout and you're making excellent progress."
    ];
    
    return genericResponses[Math.floor(Math.random() * genericResponses.length)];
  }
  const processViaLLM = useCallback(async (text) => {
    try {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      setIsStreaming(true);
      await trackExerciseData();
      await runPoseAnalysis();
      const systemMsg = { role: 'system', content: `You are an expert coach. Stats: Push-ups ${countsRef.current.pushups}, Sit-ups ${countsRef.current.situps}, HR ${hrRef.current}` };
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [systemMsg, ...dialogueHistory, { role: 'user', content: text }] }),
        signal: abortControllerRef.current.signal
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const reply = json.response.content;
      setDialogueHistory(h => [...h, { role: 'assistant', content: reply }]);
      speak(reply);
      onCommandProcessed?.(text, reply);
    } catch (err) {
      console.error('[Voice] LLM error:', err);
      const mock = getMockResponse(text, { pushups: countsRef.current.pushups, situps: countsRef.current.situps, heartRate: hrRef.current });
      setDialogueHistory(h => [...h, { role: 'assistant', content: mock }]);
      speak(`Sorry, I'm offline. ${mock}`);
      onCommandProcessed?.(text, mock);
    } finally {
      setIsStreaming(false);
    }
  }, [dialogueHistory, runPoseAnalysis, trackExerciseData, speak, onCommandProcessed]);

  // Set up processViaLLMRef
  useEffect(() => {
    processViaLLMRef.current = processViaLLM;
  }, [processViaLLM]);

  // Setup wake word detection
  useEffect(() => {
    if (!isSupported || !wakeEnabled) return;
    
    const setupWakeWordDetection = () => {
      if (wakeWordListenerRef.current) return;
      
      try {
        const wakeRecog = new SpeechRecognition();
        wakeRecog.continuous = true;
        wakeRecog.interimResults = true;
        wakeRecog.lang = DEFAULT_LANGUAGE;
        
        wakeRecog.onresult = ({ results }) => {
          const lastResult = results[results.length - 1];
          if (lastResult.isFinal) {
            const text = lastResult[0].transcript.trim().toLowerCase();
            console.log('[Voice] Wake heard:', text);
            
            // Check if the text contains any wake words
            if (WAKE_WORDS.some(wake => text.includes(wake))) {
              console.log('[Voice] Wake word detected');
              wakeRecog.stop();
              // Small delay to let the user start their actual command
              setTimeout(() => {
                startListening();
              }, 300);
            }
          }
        };
        
        wakeRecog.onend = () => {
          if (wakeEnabled) {
            try {
              // Restart wake word detection when it ends, if still enabled
              wakeRecog.start();
            } catch (e) {
              console.error("[Voice] Error restarting wake word detection:", e);
            }
          }
        };
        
        wakeRecog.onerror = (e) => {
          console.error('[Voice] Wake word error:', e.error);
          if (e.error !== 'aborted' && e.error !== 'no-speech') {
            setVoiceError(`Wake word error: ${e.error}`);
          }
        };
        
        wakeWordListenerRef.current = wakeRecog;
        
        try {
          wakeRecog.start();
          console.log('[Voice] Wake word detection started');
        } catch (e) {
          console.error("[Voice] Error starting wake word detection:", e);
          setVoiceError(`Failed to start wake word detection: ${e.message}`);
        }
      } catch (err) {
        console.error('[Voice] Failed to start wake word detection:', err);
        setVoiceError(`Wake word setup error: ${err.message}`);
      }
    };
    
    const stopWakeWordDetection = () => {
      if (wakeWordListenerRef.current) {
        try {
          wakeWordListenerRef.current.onend = null;
          wakeWordListenerRef.current.stop();
        } catch (e) {
          console.error("[Voice] Error stopping wake word detection:", e);
        }
        wakeWordListenerRef.current = null;
        console.log('[Voice] Wake word detection stopped');
      }
    };
    
    if (wakeEnabled) {
      setupWakeWordDetection();
    } else {
      stopWakeWordDetection();
    }
    
    return () => stopWakeWordDetection();
  }, [isSupported, wakeEnabled, startListening]);

  // Speech recognition setup
  useEffect(() => {
    // Permissions API check
    if (navigator && navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' }).then(status => {
        if (status.state === 'denied') {
          setVoiceError('Microphone access is blocked. Please enable it in browser settings.');
        }
        status.onchange = () => {
          setVoiceError(
            status.state === 'denied'
              ? 'Microphone access is blocked. Please enable it in browser settings.'
              : null
          );
        };
      }).catch(err => {
        console.error('[Voice] Permissions API error:', err);
      });
    }

    if (!isSupported) {
      setVoiceError('Speech API not supported in this browser');
      return;
    }

    // Load TTS voices
    const loadVoices = () => {
      try {
        const voices = speechSynthesis.getVoices();
        if (voices.length) {
          setAvailableVoices(voices);
          // Try to find a good voice for coaching - prefer male voices if available
          const coachVoice = voices.find(v => 
            v.lang === DEFAULT_LANGUAGE && 
            (v.name.includes('Male') || v.name.includes('Guy')));
          const def = coachVoice || voices.find(v => v.lang === DEFAULT_LANGUAGE && v.default) || voices[0];
          setSelectedVoice(def);
        }
      } catch (e) {
        console.error('[Voice] Error loading voices:', e);
      }
    };
    
    try {
      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;
    } catch (e) {
      console.error('[Voice] Error with speech synthesis:', e);
    }

    // Setup SpeechRecognition
    try {
      const recog = new SpeechRecognition();
      recog.continuous     = false;
      recog.interimResults = false;
      recog.lang           = DEFAULT_LANGUAGE;

      recog.onstart = () => setIsListening(true);
      recog.onend   = () => {
        setIsListening(false);
        clearTimeout(silenceTimeout.current);
      };
      recog.onerror = e => {
        const msg = e.error === 'not-allowed'
          ? 'Microphone permission denied'
          : `Recognition error: ${e.error}`;
        setVoiceError(msg);
        setIsListening(false);
      };
      recog.onresult = ({ results }) => {
        try {
          const text = results[results.length - 1][0].transcript.trim();
          processViaLLMRef.current?.(text);
          recog.stop();
        } catch (e) {
          console.error('[Voice] Error processing speech result:', e);
          setVoiceError(`Failed to process speech: ${e.message}`);
        }
      };

      recognitionRef.current = recog;
    } catch (e) {
      console.error('[Voice] Error setting up speech recognition:', e);
      setVoiceError(`Speech recognition initialization failed: ${e.message}`);
    }
    
    return () => {
      try {
        if (speechSynthesis) {
          speechSynthesis.cancel();
          speechSynthesis.onvoiceschanged = null;
        }
        clearTimeout(silenceTimeout.current);
        
        if (recognitionRef.current) {
          recognitionRef.current.onstart = recognitionRef.current.onresult = 
            recognitionRef.current.onend = recognitionRef.current.onerror = null;
          if (isListening) {
            recognitionRef.current.stop();
          }
        }
        
        // Abort any pending fetch
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      } catch (e) {
        console.error('[Voice] Error in cleanup:', e);
      }
    };
  }, [isSupported, isListening]);

  // Begin regular analysis of pose data for proactive coaching
  useEffect(() => {
    let analysisTimer = null;
    
    const runAutomaticAnalysis = async () => {
      // Only analyze if we have landmarks
      if (detectionRef.current && detectionRef.current.landmarks && detectionRef.current.landmarks.length > 0) {
        try {
          const analysis = await runPoseAnalysis();
          setAnalysisData(analysis);
        } catch (err) {
          console.error('[Voice] Analysis error:', err);
        }
      }
    };
    
    // Run analysis every 5 seconds
    analysisTimer = setInterval(runAutomaticAnalysis, 5000);
    
    return () => {
      clearInterval(analysisTimer);
    };
  }, [isSpeaking, isListening, runPoseAnalysis]);

  return {
    isSupported,
    isListening,
    isSpeaking,
    isStreaming,
    wakeEnabled,
    dialogueHistory,
    voiceError,
    availableVoices,
    currentVoice: selectedVoice,
    analysisData,
    startListening,
    stopListening,
    speak,
    processViaLLM,
    setSelectedVoice: name => {
      const v = availableVoices.find(x => x.name === name);
      if (v) setSelectedVoice(v);
    },
    toggleWakeWord: () => setWakeEnabled(w => !w)
  };
}