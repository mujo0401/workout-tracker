// src/Overlays/HeartRateOverlay.jsx

import React, { useState, useEffect, useRef } from 'react';
import '../css/HeartRateOverlay.css';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faTimes, faSpinner, faLink } from '@fortawesome/free-solid-svg-icons';

export default function HeartRateOverlay({
  open,
  onClose,
  setHeartRate,
  onScanning,
  onConnecting,
  onConnect,
  onDisconnect,
  onError,
  autoScan 
}) {
  if (!open) return null;

  const [selectedDevice, setSelectedDevice]         = useState(null);
  const [error, setError]                           = useState(null);
  const [isDeviceListVisible, setIsDeviceListVisible] = useState(false);
  const [isScanning, setIsScanning]                 = useState(false);

  const hrCharRef = useRef(null);
  const deviceRef = useRef(null);
  let   poller    = null;

  useEffect(() => {
    if (open && autoScan) {
      handleScanClick();
    }
  }, [open, autoScan]);

  // Parse incoming heart‐rate packets
  const handleHeartRateChanged = (event) => {
    const dataView = event.target.value;
    const raw      = Array.from(new Uint8Array(dataView.buffer));
    console.log('[HR] raw bytes:', raw, 'length:', dataView.byteLength);

    if (dataView.byteLength < 2) {
      console.warn('[HR] Packet too short – ignoring');
      return;
    }

    const flags   = dataView.getUint8(0);
    let   hrValue = dataView.getUint8(1);

    // if bit0=1 → 16-bit, and we have the extra byte
    if ((flags & 0x1) === 1 && dataView.byteLength >= 3) {
      hrValue = dataView.getUint16(1, true);
    }

    console.log(`[HR] flags=0x${flags.toString(16)}, bpm=${hrValue}`);
    setHeartRate(hrValue);
  };

  // Cleanup on unexpected disconnect
  const handleDeviceDisconnected = () => {
    console.log('[HeartRateOverlay] GATT server disconnected');
    handleDeselect();
  };

  const connectAndStartNotifications = async (btDevice) => {
    try {
      onConnecting?.();

      const server  = await btDevice.gatt.connect();
      const service = await server.getPrimaryService('heart_rate');
      const char    = await service.getCharacteristic('heart_rate_measurement');
      hrCharRef.current = char;

      // attach listener before starting notifications
      char.addEventListener('characteristicvaluechanged', handleHeartRateChanged);

      // log capabilities
      console.log('[HR] properties:', {
        read:    char.properties.read,
        notify:  char.properties.notify
      });

      // start notifications
      await char.startNotifications();

      // initial read if available
      try {
        const initial = await char.readValue();
        handleHeartRateChanged({ target: { value: initial } });
      } catch (readErr) {
        console.warn('[HR] initial read failed:', readErr);
      }

      // fallback polling if notify isn’t supported
      if (!char.properties.notify && char.properties.read) {
        poller = setInterval(async () => {
          try {
            const v = await char.readValue();
            handleHeartRateChanged({ target: { value: v } });
          } catch (pollErr) {
            console.warn('[HR] poll read failed:', pollErr);
          }
        }, 1000);
      }

      onConnect?.();
    } catch (err) {
      const msg = `HR Sensor Error: ${err.message}`;
      console.error('[HR]', msg);
      setError(msg);
      onError?.(msg);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hrCharRef.current) {
        hrCharRef.current.removeEventListener(
          'characteristicvaluechanged',
          handleHeartRateChanged
        );
        hrCharRef.current.stopNotifications().catch(() => {});
      }
      if (poller) {
        clearInterval(poller);
      }
      if (deviceRef.current) {
        deviceRef.current.removeEventListener(
          'gattserverdisconnected',
          handleDeviceDisconnected
        );
        if (deviceRef.current.gatt.connected) {
          deviceRef.current.gatt.disconnect();
        }
      }
      setHeartRate(null);
      onDisconnect?.();
    };
  }, []);

  const handleSelect = ({ id, name, deviceObject }) => {
    setSelectedDevice({ id, name });
    deviceRef.current = deviceObject;
    deviceObject.addEventListener(
      'gattserverdisconnected',
      handleDeviceDisconnected
    );
    connectAndStartNotifications(deviceObject);
    setIsDeviceListVisible(false);
    setIsScanning(false);
  };

  const handleDeselect = () => {
    if (hrCharRef.current) {
      hrCharRef.current.stopNotifications().catch(() => {});
    }
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    setSelectedDevice(null);
    setError(null);
    setHeartRate(null);
    onDisconnect?.();
  };

  const handleScanClick = async () => {
    if (isScanning) {
      // user cancels scan
      setIsScanning(false);
      onDisconnect?.();
      return;
    }

    setIsScanning(true);
    setError(null);
    onScanning?.();

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }]
      });

      onConnecting?.();
      // here you would connect and start notifications
      await connectAndStartNotifications(device);
      setSelectedDevice(device);
      onConnect?.();
    } catch (e) {
      // ignore user-cancelled chooser errors
      if (e.name === 'NotFoundError' || e.message.includes('User cancelled')) {
        // no error state needed
      } else {
        console.error('HeartRateOverlay error:', e);
        const msg = e.message || 'Unknown error';
        setError(msg);
        onError?.(msg);
      }
    } finally {
      setIsScanning(false);
    }
  };


  return (
    <div className="heart-overlay-container">
      <button className="close-btn" onClick={onClose}>
        <FontAwesomeIcon icon={faTimes} />
      </button>

      {/* hide manual scan button when autoScan is active */}
      {!autoScan && (
        <button
          onClick={handleScanClick}
          className={`bt-overlay-button ${selectedDevice ? 'connected' : ''}`}
          title={
            selectedDevice ? 'Disconnect' :
            isScanning   ? 'Cancel Scan' :
                           'Scan for HR Monitor'
          }
        >
          <FontAwesomeIcon
            icon={isScanning ? faSpinner : (selectedDevice ? faTimes : faHeart)}
            spin={isScanning}
          />
        </button>
      )}

           {/* show error only when real error */}
           {error && (
        <div className="hr-error">
          Error: {error}
        </div>
      )}

      {isDeviceListVisible && !selectedDevice && (
        <div className="bt-device-list">
          <button
            onClick={() => {
              setIsDeviceListVisible(false);
              setIsScanning(false);
              onDisconnect?.();
            }}
            className="bt-close-button"
          >
            &times;
          </button>
          <h4 className="bt-list-header">Available Devices</h4>
          {isScanning && (
            <div className="bt-scanning">
              <FontAwesomeIcon icon={faSpinner} spin /> Scanning…
            </div>
          )}
          {!isScanning && error && (
            <div className="bt-list-error">
              <FontAwesomeIcon icon={faTimes} /> {error}
            </div>
          )}
        </div>
      )}

      {selectedDevice && (
        <div className="bt-status-indicator paired">
          <FontAwesomeIcon icon={faLink} className="bt-paired-icon" />
          <span>Paired with: {selectedDevice.name}</span>
        </div>
      )}

      {error && !isDeviceListVisible && (
        <div className="bt-general-error">Error: {error}</div>
      )}
    </div>
  );
}

HeartRateOverlay.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  setHeartRate: PropTypes.func.isRequired,
  onScanning: PropTypes.func,
  onConnecting: PropTypes.func,
  onConnect: PropTypes.func,
  onDisconnect: PropTypes.func,
  onError: PropTypes.func,
  autoScan: PropTypes.bool
};