/*
  Updated Smart Bike Integration for Schwinn IC4 – React Overlay & Bluetooth Hook
  Tracks real-time Watts, Resistance, RPM, and Calories accurately.
*/

// src/config/bluetoothConstants.js

// Fitness Machine Service (FTMS)
export const FTMS_SERVICE           = 0x1826;                            // 00001826-0000-1000-8000-00805f9b34fb

// FTMS Characteristics
export const FTMS_RESISTANCE        = '00002ad9-0000-1000-8000-00805f9b34fb'; // Fitness Machine Control Point
export const FTMS_STATUS            = '00002ada-0000-1000-8000-00805f9b34fb'; // Fitness Machine Status
export const FTMS_INDOOR_BIKE_DATA  = '00002ad2-0000-1000-8000-00805f9b34fb'; // Indoor Bike Data

// Cycling Power Service (raw power fallback)
export const CYCLING_POWER_SERVICE      = 0x1818;                            // 00001818-0000-1000-8000-00805f9b34fb
export const CYCLING_POWER_MEASUREMENT  = '00002a63-0000-1000-8000-00805f9b34fb'; // Cycling Power Measurement

// Heart Rate Service
export const HEART_RATE_SERVICE     = 0x180d;                            // 0000180d-0000-1000-8000-00805f9b34fb
export const HEART_RATE_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb'; // Heart Rate Measurement

// Predefined workouts
export const PRESET_WORKOUTS = [
  {
    id: 'hiit1',
    name: 'HIIT 20',
    description: '20-minute High Intensity Interval Training',
    segments: [
      { type: 'warmup', duration: 180, resistance: 20, cadence: '70-80' },
      { type: 'sprint', duration: 30, resistance: 50, cadence: '100+' },
      { type: 'recovery', duration: 90, resistance: 25, cadence: '70-80' },
      { type: 'sprint', duration: 30, resistance: 50, cadence: '100+' },
      { type: 'recovery', duration: 90, resistance: 25, cadence: '70-80' },
      { type: 'sprint', duration: 30, resistance: 50, cadence: '100+' },
      { type: 'recovery', duration: 90, resistance: 25, cadence: '70-80' },
      { type: 'sprint', duration: 30, resistance: 55, cadence: '100+' },
      { type: 'recovery', duration: 90, resistance: 25, cadence: '70-80' },
      { type: 'sprint', duration: 30, resistance: 55, cadence: '100+' },
      { type: 'recovery', duration: 90, resistance: 25, cadence: '70-80' },
      { type: 'sprint', duration: 30, resistance: 60, cadence: '100+' },
      { type: 'recovery', duration: 90, resistance: 25, cadence: '70-80' },
      { type: 'cooldown', duration: 180, resistance: 15, cadence: '60-70' }
    ]
  },
  {
    id: 'endurance1',
    name: 'Endurance 30',
    description: '30-minute Endurance Ride',
    segments: [
      { type: 'warmup', duration: 300, resistance: 20, cadence: '70-80' },
      { type: 'climb', duration: 300, resistance: 35, cadence: '60-70' },
      { type: 'flat', duration: 300, resistance: 25, cadence: '80-90' },
      { type: 'climb', duration: 300, resistance: 40, cadence: '60-70' },
      { type: 'flat', duration: 300, resistance: 25, cadence: '80-90' },
      { type: 'cooldown', duration: 300, resistance: 15, cadence: '60-70' }
    ]
  },
  {
    id: 'ftp',
    name: 'FTP Test',
    description: '20-minute FTP Test',
    segments: [
      { type: 'warmup', duration: 600, resistance: 25, cadence: '80-90' },
      { type: 'effort', duration: 300, resistance: 40, cadence: '90-100' },
      { type: 'recovery', duration: 300, resistance: 25, cadence: '70-80' },
      { type: 'ftp', duration: 1200, resistance: 50, cadence: '85-95' },
      { type: 'cooldown', duration: 300, resistance: 15, cadence: '60-70' }
    ]
  }
];