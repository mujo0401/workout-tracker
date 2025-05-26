// src/hooks/useHeartRateMonitor.js
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  HEART_RATE_SERVICE,
  HEART_RATE_MEASUREMENT,
} from '../config/bluetoothConstants.js';

const useHeartRateMonitor = ({
  onSuccessMessage,
  onErrorMessage,
  onDeviceConnected,
  onDeviceDisconnected,
} = {}) => {
  const [hrStatus, setHrStatus] = useState('disconnected');
  const [connectedHrmDevice, setConnectedHrmDevice] = useState(null);
  const [hrDeviceName, setHrDeviceName] = useState('');
  const [heartRateValue, setHeartRateValue] = useState(0);
  const hrCharacteristicRef = useRef(null);
  const gattServerRef = useRef(null);

  // ---EFFECT LOGGING ---
  // const effectLog = useRef(0);
  // useEffect(() => {
  //   effectLog.current +=1;
  //   _log(`MAIN EFFECT RUNNING #${effectLog.current}. Device: ${connectedHrmDevice?.name}. Status: ${hrStatus}`);
  // });
  // --- END EFFECT LOGGING ---

  const _log = (message, ...args) => console.log('[useHeartRateMonitor]', message, ...args);

  const handleBleError = useCallback((context, error) => {
    const errorName = error?.name || 'UnknownError';
    const errorMessage = error?.message || String(error) || 'Unknown Bluetooth error';
    const fullMessage = `HRM Error (${context}): ${errorName} - ${errorMessage}`;
    _log(`ERROR in ${context}: Name: ${errorName}, Message: ${errorMessage}`, error);
    onErrorMessage?.(fullMessage);
  }, [onErrorMessage]);

  const handleHeartRateData = useCallback((event) => {
    try {
      const value = event.target.value;
      const flags = value.getUint8(0);
      const rate16Bits = (flags & 0x1) !== 0;
      let hr = value.getUint8(1);
      if (rate16Bits && value.byteLength >= 3) {
        hr = value.getUint16(1, true);
      }
      setHeartRateValue(hr);
      // _log('HRM Data:', hr);
    } catch (e) {
      handleBleError('Parsing HRM data', e);
    }
  }, [handleBleError]);

  const resetHrmConnectionState = useCallback((notify = true, newStatus = 'disconnected') => {
    _log(`Resetting HRM state. Current: ${hrStatus}, Requested New: ${newStatus}, Device: ${connectedHrmDevice?.name}`);

    if (hrCharacteristicRef.current) {
      try {
        hrCharacteristicRef.current.removeEventListener('characteristicvaluechanged', handleHeartRateData);
        if (typeof hrCharacteristicRef.current.stopNotifications === 'function') {
          hrCharacteristicRef.current.stopNotifications()
            .then(() => _log('HRM notifications stopped on reset.'))
            .catch(e => _log('Error stopping notifications on reset:', e.name, e.message));
        }
      } catch (e) { _log('Error cleaning HR char listener on reset:', e.name, e.message); }
    }
    hrCharacteristicRef.current = null;

    const gatt = gattServerRef.current;
    if (gatt && gatt.connected) {
      _log('Ensuring GATT is disconnected during reset state.');
      gatt.disconnect();
    }
    gattServerRef.current = null;

    const previousDeviceName = connectedHrmDevice?.name; // Get name before setting to null
    setConnectedHrmDevice(null); // This is a dependency of the main useEffect
    setHrDeviceName('');
    setHeartRateValue(0);
    setHrStatus(newStatus);

    if (notify && onDeviceDisconnected) {
      _log(`Notifying parent of disconnect for device: ${previousDeviceName || 'unknown'}`);
      onDeviceDisconnected(previousDeviceName);
    }
  }, [hrStatus, connectedHrmDevice, onDeviceDisconnected, handleHeartRateData]);


  const handleHrmGattDisconnected = useCallback(() => {
    const currentDeviceName = hrDeviceName; // Capture for log
    _log(`GATT server disconnected event. Current status: ${hrStatus}, Device name from state: ${currentDeviceName}`);
    if (hrStatus !== 'disconnected' && hrStatus !== 'error') {
      _log('GATT disconnected event causing state reset to "disconnected".');
      resetHrmConnectionState(true, 'disconnected');
    } else {
      _log(`GATT disconnected event noted, but status already ${hrStatus}. Ensuring refs are cleared.`);
      gattServerRef.current = null;
      if (hrCharacteristicRef.current) {
        try { hrCharacteristicRef.current.removeEventListener('characteristicvaluechanged', handleHeartRateData); } catch (e) {/*ignore*/ }
        hrCharacteristicRef.current = null;
      }
    }
  }, [resetHrmConnectionState, hrStatus, hrDeviceName, handleHeartRateData]);


  const connectHRM = useCallback(async () => {
    if (!navigator.bluetooth) {
      handleBleError('Unsupported Browser', { message: 'Web Bluetooth API is not available.' });
      setHrStatus('error');
      return;
    }
    // Prevent re-entry if already in a connecting/discovering/connected state
    if (['connecting', 'discovering', 'connected', 'scanning'].includes(hrStatus)) {
       _log(`Connection attempt ignored; status already: ${hrStatus}`);
       // Optionally notify user if status is 'connected'
       if (hrStatus === 'connected') onSuccessMessage?.(`HRM "${hrDeviceName}" is already connected.`);
       else onSuccessMessage?.(`HRM connection process is already ongoing (Status: ${hrStatus}).`);
       return;
    }


    _log('Starting HRM connection...');
    setHrStatus('scanning');
    setHeartRateValue(0);
    onSuccessMessage?.('Scanning for HRMs... Please select device.');

    let deviceInstance;
    try {
      _log('Requesting Bluetooth device...');
      deviceInstance = await navigator.bluetooth.requestDevice({
        filters: [{ services: [HEART_RATE_SERVICE] }],
        optionalServices: [HEART_RATE_SERVICE],
      });

      if (!deviceInstance) {
          _log('No device selected by user or requestDevice returned null.');
          setHrStatus('disconnected');
          onErrorMessage?.('No HRM device was selected.');
          return;
      }
      _log('Device selected:', deviceInstance.name || 'Unnamed Device');

      // Cleanup listener from any *previously* connected device state.
      // `connectedHrmDevice` from state might be the one we are trying to connect to again if it's a retry.
      if (connectedHrmDevice && connectedHrmDevice.id !== deviceInstance.id && typeof connectedHrmDevice.removeEventListener === 'function') {
        _log('Cleaning up listener from PREVIOUSLY connected device:', connectedHrmDevice.name);
        connectedHrmDevice.removeEventListener('gattserverdisconnected', handleHrmGattDisconnected);
      } else if (connectedHrmDevice && connectedHrmDevice.id === deviceInstance.id) {
        _log('Attempting to connect to the same device again. Ensuring old listener is cleared if any anomalies.');
        // This path implies a retry on the same device that previously failed or disconnected.
        // The listener should ideally be removed on disconnect/error by the event handler or reset function.
      }
      
      deviceInstance.addEventListener('gattserverdisconnected', handleHrmGattDisconnected);
      // This is a critical state change that will make the main useEffect re-run
      setConnectedHrmDevice(deviceInstance);
      setHrDeviceName(deviceInstance.name || 'Unnamed HRM');
      setHrStatus('connecting');
      _log(`Status: connecting to "${deviceInstance.name || 'Unnamed HRM'}" (ID: ${deviceInstance.id})`);
      onSuccessMessage?.(`Connecting to ${deviceInstance.name || 'HRM'}...`);

      _log('Attempting device.gatt.connect()...');
      gattServerRef.current = await deviceInstance.gatt.connect();
      _log('device.gatt.connect() resolved. GATT server connected:', gattServerRef.current?.connected);

      if (!gattServerRef.current?.connected) {
        _log('CRITICAL CHECK FAILED: GATT not connected after connect() resolved.');
        throw new Error('GATT Server connection failed or disconnected immediately after connect.');
      }
      _log('GATT connection successful.');

      setHrStatus('discovering');
      _log(`Status: discovering services for "${deviceInstance.name}"`);
      onSuccessMessage?.('GATT connected. Discovering services...');

      _log(`Attempting getPrimaryService(0x${HEART_RATE_SERVICE.toString(16)})...`);
      const service = await gattServerRef.current.getPrimaryService(HEART_RATE_SERVICE);
      _log(`Primary service found. Attempting getCharacteristic(0x${HEART_RATE_MEASUREMENT.toString(16)})...`);
      hrCharacteristicRef.current = await service.getCharacteristic(HEART_RATE_MEASUREMENT);
      _log('Characteristic found. Attempting startNotifications()...');

      // Ensure no duplicate listeners if retrying on same characteristic object (unlikely but safe)
      hrCharacteristicRef.current.removeEventListener('characteristicvaluechanged', handleHeartRateData);
      hrCharacteristicRef.current.addEventListener('characteristicvaluechanged', handleHeartRateData);
      await hrCharacteristicRef.current.startNotifications();
      _log('Notifications started successfully.');

      setHrStatus('connected');
      _log(`Status: connected to "${deviceInstance.name}"`);
      onDeviceConnected?.(deviceInstance.name || 'Unnamed HRM');
      onSuccessMessage?.(`HRM "${deviceInstance.name || 'Unnamed HRM'}" connected.`);

    } catch (e) {
      _log(`!!! connectHRM CATCH BLOCK: Error Name: "${e.name}", Message: "${e.message}"`);
      handleBleError('HRM connection/discovery', e);

      // deviceInstance might be null if requestDevice itself failed (e.g. user cancellation BEFORE selection)
      // or if it's the device that we were attempting to connect to.
      const deviceInError = deviceInstance || connectedHrmDevice; 

      if (deviceInError?.gatt && deviceInError.gatt.connected) {
        _log(`GATT server for "${deviceInError.name}" was reported as connected when error occurred. Attempting explicit disconnect.`);
        deviceInError.gatt.disconnect(); // Should trigger gattserverdisconnected
      } else {
        _log('GATT server was not connected or no deviceInstance/connectedHrmDevice with gatt property when error occurred.');
      }

      let finalStatusOnError = 'error';
      if (e.name === 'NotFoundError') {
        _log('NotFoundError encountered (user cancel OR service/char not found). Treating as "disconnected".');
        finalStatusOnError = 'disconnected';
      } else if (e.name === 'NotAllowedError') {
        _log('NotAllowedError encountered (permissions). Status will be "error".');
      }
      // For other errors like NetworkError (GATT disconnected during operations), status remains 'error'.

      // Check current status before resetting to prevent redundant actions if gattserverdisconnected already handled it
      if (hrStatus !== 'disconnected' && hrStatus !== finalStatusOnError) {
          _log(`Calling resetHrmConnectionState from catch block. Current status: ${hrStatus}, New status: ${finalStatusOnError}`);
          resetHrmConnectionState(false, finalStatusOnError); // Don't double-notify parent about disconnect
      } else if (hrStatus === 'disconnected' && finalStatusOnError === 'error') {
          // If already disconnected by event, but this is a more specific error, ensure status is 'error'.
          _log(`Status was 'disconnected', but error is more specific. Updating to 'error'.`);
          resetHrmConnectionState(false, 'error');
      } else {
          _log(`State already '${hrStatus}'. Reset not called from catch block's final section or forced if refs unclear.`);
           // Safeguard: if state is already terminal but refs aren't cleared
          if (gattServerRef.current || hrCharacteristicRef.current || (connectedHrmDevice && connectedHrmDevice !== null) ) { // check connectedHrmDevice against null
             _log('Forcing a reset call because refs were not clear despite terminal status.');
             resetHrmConnectionState(false, hrStatus); // Reset with current terminal status to ensure full cleanup.
          }
      }
    }
  }, [
    hrStatus, connectedHrmDevice, hrDeviceName, // Added hrDeviceName for logging consistency
    onSuccessMessage, onErrorMessage, onDeviceConnected, // Callbacks to parent
    handleBleError, handleHeartRateData, handleHrmGattDisconnected, resetHrmConnectionState // Internal callbacks
  ]);

  const disconnectHRM = useCallback(async () => {
    _log(`User initiated disconnectHRM. Device: ${connectedHrmDevice?.name}, Status: ${hrStatus}`);
    if (connectedHrmDevice?.gatt?.connected) {
      _log('Attempting to disconnect GATT...');
      try {
        connectedHrmDevice.gatt.disconnect(); // This should trigger the 'gattserverdisconnected' event.
      } catch (e) {
        _log('Error during user-initiated GATT disconnect:', e.name, e.message);
        handleBleError('User disconnect', e);
        resetHrmConnectionState(true, 'error'); // Force reset if disconnect() itself throws
      }
    } else {
      _log('No active GATT connection or device to disconnect. Ensuring state is reset if not already disconnected.');
      if (hrStatus !== 'disconnected') { // Only reset if not already in 'disconnected' state
        resetHrmConnectionState(true, 'disconnected');
      }
    }
  }, [connectedHrmDevice, hrStatus, handleBleError, resetHrmConnectionState]);

  // Main useEffect for cleaning up listeners on the connectedHrmDevice
  useEffect(() => {
    const deviceForEffect = connectedHrmDevice; // Capture the device instance for this effect run
    _log(`Main useEffect setup/re-run. Current device: ${deviceForEffect?.name}, Status: ${hrStatus}`);

    return () => {
      // This cleanup runs when deviceForEffect changes (becomes null or a new device) OR when the component unmounts.
      _log(`Main useEffect cleanup. Device was: ${deviceForEffect?.name}`);
      if (deviceForEffect && typeof deviceForEffect.removeEventListener === 'function') {
        _log('Removing gattserverdisconnected listener from (cleanup):', deviceForEffect.name);
        deviceForEffect.removeEventListener('gattserverdisconnected', handleHrmGattDisconnected);
      }
      // Characteristic listeners are removed in resetHrmConnectionState
    };
  }, [connectedHrmDevice, handleHrmGattDisconnected, handleHeartRateData]); // handleHeartRateData is stable, handleHrmGattDisconnected changes with hrStatus/hrDeviceName/resetHrmConnectionState

  return {
    hrStatus,
    hrDeviceName,
    heartRateValue,
    connectHRM,
    disconnectHRM,
  };
};

export default useHeartRateMonitor;