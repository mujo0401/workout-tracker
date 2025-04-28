// src/Overlays/HeartRateOverlay.jsx

import React, { useState, useEffect, useRef } from 'react';
import '../css/HeartRateOverlay.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faTimes, faSpinner, faLink } from '@fortawesome/free-solid-svg-icons';

export default function HeartRateOverlay({
  setHeartRate,
  onScanning,
  onConnecting,
  onConnect,
  onDisconnect,
  onError
}) {
  const [selectedDevice, setSelectedDevice]         = useState(null);
  const [error, setError]                           = useState(null);
  const [isDeviceListVisible, setIsDeviceListVisible] = useState(false);
  const [isScanning, setIsScanning]                 = useState(false);

  const hrCharRef = useRef(null);
  const deviceRef = useRef(null);
  let   poller    = null;

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
    if (selectedDevice) {
      handleDeselect();
      return;
    }
    if (isScanning) {
      setIsScanning(false);
      setIsDeviceListVisible(false);
      onDisconnect?.();
      return;
    }

    setError(null);
    setIsScanning(true);
    setIsDeviceListVisible(true);
    onScanning?.();

    if (!navigator.bluetooth) {
      const msg = 'Web Bluetooth API not supported';
      setError(msg);
      onError?.(msg);
      return;
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['heart_rate']
      });

      // Immediately select any heart-rate device—no name check
      handleSelect({
        id:           device.id,
        name:         device.name,
        deviceObject: device
      });
    } catch (err) {
      const msg = `Error selecting device: ${err.message}`;
      setError(msg);
      onError?.(msg);
    }
  };

  return (
    <>
      <button
        onClick={handleScanClick}
        className={`bt-overlay-button ${selectedDevice ? 'connected' : ''}`}
        title={
          selectedDevice ? 'Disconnect' :
          isScanning     ? 'Cancel Scan' :
                            'Scan for HR Monitor'
        }
      >
        <FontAwesomeIcon
          icon={selectedDevice || isScanning ? faTimes : faHeart}
          spin={isScanning}
        />
      </button>

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
    </>
  );
}
