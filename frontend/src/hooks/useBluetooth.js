import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FTMS_SERVICE,
  FTMS_RESISTANCE, // Control Point
  FTMS_STATUS,
  FTMS_INDOOR_BIKE_DATA,
  CYCLING_POWER_SERVICE,
  CYCLING_POWER_MEASUREMENT,
  HEART_RATE_SERVICE,
  HEART_RATE_MEASUREMENT,
} from '../config/bluetoothConstants';

const useBluetooth = ({
  onSuccessMessage,
  onErrorMessage,
  onDeviceConnected,
  onDeviceDisconnected,
  initialResistanceOffset = 0,
}) => {
  // --- state & refs ---
  const [status, setStatus] = useState('disconnected');
  const [device, setDevice] = useState(null);
  const [deviceName, setDeviceName] = useState('');
  const controlCharRef = useRef(null);
  const gattServerRef  = useRef(null);

  const [power, setPower] = useState(0);
  const [cadence, setCadence] = useState(0);
  const [heartRate, setHeartRate] = useState(0);
  const [currentDeviceResistance, setCurrentDeviceResistance] = useState(0);

  const prevCrankDataRef    = useRef({ revs: null, time: null });
  const [resistanceOffset, setResistanceOffset] = useState(initialResistanceOffset);

  // Sync offset prop
  useEffect(() => {
    setResistanceOffset(initialResistanceOffset);
  }, [initialResistanceOffset]);

  // --- error handler ---
  const handleBleError = useCallback((msg, err) => {
    console.error(msg, err);
    onErrorMessage?.(err?.message || msg);
  }, [onErrorMessage]);

  // --- parse Indoor Bike Data char ---
  const handleIndoorBikeData = useCallback((event) => {
    try {
      const dv = event.target.value;
      let offset = 0;
      const flags = dv.getUint16(offset, true); offset += 2;
      const instPow = dv.getInt16(offset, true); offset += 2;
      setPower(instPow);
      if (flags & 0x0004 && dv.byteLength >= offset + 2) {
        const rawCadence = dv.getUint16(offset, true);
        setCadence(Math.round(rawCadence * 0.5));
      }
    } catch (e) {
      handleBleError('Indoor Bike Data parse error', e);
    }
  }, [handleBleError]);

  // --- parse Heart Rate ---
  const handleHeartRateData = useCallback((event) => {
    try {
      const dv = event.target.value;
      const flags = dv.getUint8(0);
      const is16 = (flags & 0x01) !== 0;
      const hr = is16
        ? dv.getUint16(1, true)
        : dv.getUint8(1);
      setHeartRate(hr);
    } catch (e) {
      handleBleError('Heart Rate parse error', e);
    }
  }, [handleBleError]);

  // --- parse FTMS status ---
  const handleFtmsStatus = useCallback((event) => {
    try {
      const dv = event.target.value;
      const op = dv.getUint8(0);
      if (op === 0x80 && dv.byteLength >= 3) {
        const req = dv.getUint8(1), res = dv.getUint8(2);
        if (req === 0x05 && res !== 0x01) {
          handleBleError(`Set resistance failed (code ${res})`);
        }
      }
    } catch (e) {
      handleBleError('FTMS status parse error', e);
    }
  }, [handleBleError]);

  // --- scan & connect ---
  const scanAndConnect = useCallback(async () => {
    if (!navigator.bluetooth) {
      handleBleError('Web Bluetooth unsupported');
      setStatus('error');
      return;
    }
    setStatus('scanning');
  
    try {
      // Request device supporting FTMS or Cycling Power
      const dev = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [FTMS_SERVICE] },
          { services: [CYCLING_POWER_SERVICE] }
        ],
        optionalServices: [
          FTMS_SERVICE,
          CYCLING_POWER_SERVICE,
          HEART_RATE_SERVICE
        ]
      });
  
      setDevice(dev);
      setDeviceName(dev.name || '');
      setStatus('connecting');
  
      // Clean up stale sessions on disconnect
      dev.addEventListener('gattserverdisconnected', () => {
        setStatus('disconnected');
        gattServerRef.current = null;
        controlCharRef.current = null;
        setPower(0); setCadence(0); setHeartRate(0);
        setCurrentDeviceResistance(0);
        onDeviceDisconnected?.();
      });
  
      // Always re-connect before service discovery
      const gatt = await dev.gatt.connect();
      gattServerRef.current = gatt;
      setStatus('discovering');
  
      // Helper to retry service retrieval
      async function getService(uuid) {
        if (!gattServerRef.current.connected) {
          gattServerRef.current = await dev.gatt.connect();  // reconnect if dropped
        }
        return await gattServerRef.current.getPrimaryService(uuid);
      }
  
      // FTMS Service
      const ftmsSvc = await getService(FTMS_SERVICE);
  
      // 1) Control Point (0x2AD9)
      controlCharRef.current = await ftmsSvc.getCharacteristic(FTMS_RESISTANCE);
  
      // 2) Status (0x2ADA)
      const statusChar = await ftmsSvc.getCharacteristic(FTMS_STATUS);
      await statusChar.startNotifications();
      statusChar.addEventListener('characteristicvaluechanged', handleFtmsStatus);
  
      // 3) Indoor Bike Data (0x2AD2)
      const indoorChar = await ftmsSvc.getCharacteristic(FTMS_INDOOR_BIKE_DATA);
      await indoorChar.startNotifications();
      indoorChar.addEventListener('characteristicvaluechanged', handleIndoorBikeData);
  
      // Optional Heart Rate
      try {
        const hrSvc  = await getService(HEART_RATE_SERVICE);
        const hrChar = await hrSvc.getCharacteristic(HEART_RATE_MEASUREMENT);
        await hrChar.startNotifications();
        hrChar.addEventListener('characteristicvaluechanged', handleHeartRateData);
      } catch {
        /* HR not supported by this device */
      }
  
      // Done!
      setStatus('connected');
      onDeviceConnected?.(dev.name);
      onSuccessMessage?.(`Connected to ${dev.name}`);
    } catch (e) {
      handleBleError('Connection failed', e);
      setStatus('error');
    }
  }, [
    handleBleError,
    handleFtmsStatus,
    handleIndoorBikeData,
    handleHeartRateData,
    onDeviceConnected,
    onDeviceDisconnected,
    onSuccessMessage
  ]);
  
  

  // --- resistance setter ---
  const setDeviceResistance = useCallback(async (percent) => {
    if (!controlCharRef.current || !gattServerRef.current?.connected) {
      handleBleError('Cannot set resistance: no connection');
      return false;
    }
    const val = Math.round(Math.max(0, Math.min(100, percent + resistanceOffset)));
    const buf = new Uint8Array(3);
    const dv  = new DataView(buf.buffer);
    dv.setUint8(0, 0x05);
    dv.setUint16(1, val, true);
    try {
      await controlCharRef.current.writeValueWithoutResponse(buf);
      setCurrentDeviceResistance(val);
      return true;
    } catch (e) {
      handleBleError('Write resistance failed', e);
      return false;
    }
  }, [handleBleError, resistanceOffset]);

  // --- cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (device?.gatt?.connected) {
        device.gatt.disconnect();
      }
    };
  }, [device]);

  // === **IMPORTANT**: return your API here ===
  return {
    status,
    deviceName,
    scanAndConnect,
    disconnect: () => device?.gatt?.disconnect(),
    power,
    cadence,
    heartRate,
    currentDeviceResistance,
    setDeviceResistance,
    updateResistanceOffset: setResistanceOffset,
  };
};

export default useBluetooth;
