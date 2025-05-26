// src/Overlays/BluetoothConnectionOverlay.jsx
import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes, faSyncAlt, faBicycle, faBolt, faHeartPulse, faRedoAlt, faLink,
  faCheckCircle, faExclamationCircle, faTimesCircle
} from '@fortawesome/free-solid-svg-icons';
import { faBluetooth } from '@fortawesome/free-brands-svg-icons';
// Removed: import useBluetooth from '../hooks/useBluetooth'; // Bike connection now managed by parent
import useHeartRateMonitor from '../hooks/useHeartRateMonitor'; // For HRM
import '../css/BluetoothConnectionOverlay.css';

export default function BluetoothConnectionOverlay({
    open,
    onClose,
    // --- Bike Connection Props (from WorkoutPlayer via BikeOverlay) ---
    onScanBike,
    onDisconnectBike,
    bikeStatus,         // e.g., 'connected', 'disconnected', 'scanning', 'error'
    bikeDeviceName,
    // Potentially pass bikePower, bikeCadence if needed for display here
    // --- End Bike Connection Props ---

    // --- HRM Connection Props (managed by useHeartRateMonitor within this component) ---
    onHrmConnected, // Callback when HRM connects via this overlay
    onError         // General error callback for issues arising in this overlay
}) {
    const [isBikeScanInProgress, setIsBikeScanInProgress] = useState(false); // For UI feedback during bike scan
    const [isHrmScanInProgress, setIsHrmScanInProgress] = useState(false);

    // Hook for Heart Rate Monitor Connection (remains internal to this overlay)
    const {
        hrStatus,
        hrDeviceName,
        heartRateValue: hrmHeartRate,
        connectHRM,
        disconnectHRM,
    } = useHeartRateMonitor({
        onSuccessMessage: msg => console.log(`HRM success: ${msg}`), // Or use onError for UI
        onErrorMessage: msg => { onError?.(`HRM: ${msg}`); setIsHrmScanInProgress(false); },
        onDeviceConnected: name => { onHrmConnected?.(name); setIsHrmScanInProgress(false); },
        onDeviceDisconnected: () => { setIsHrmScanInProgress(false); console.log('HRM disconnected');},
    });

    const handleBikeConnectDisconnect = useCallback(async () => {
        if (bikeStatus === 'connected') {
            onDisconnectBike();
        } else {
            setIsBikeScanInProgress(true);
            try {
                await onScanBike();
                // Success/error messages for bike are handled by useBluetooth in WorkoutPlayer
            } catch (err) {
                // This catch might be redundant if onScanBike itself handles and propagates errors
                onError?.(`Bike connection failed: ${err.message || 'Unknown error'}`);
            } finally {
                setIsBikeScanInProgress(false);
            }
        }
    }, [bikeStatus, onScanBike, onDisconnectBike, onError]);

    const handleHrmConnectDisconnect = useCallback(async () => {
        if (hrStatus === 'connected') {
            disconnectHRM();
        } else {
            setIsHrmScanInProgress(true);
            try {
                await connectHRM();
            } catch (err) { /* error handled by useHeartRateMonitor's onErrorMessage */ }
            // setIsHrmScanInProgress(false); // Handled by hook's callbacks
        }
    }, [hrStatus, connectHRM, disconnectHRM]);

    const getStatusIconAndClass = (status, isScanningFlag) => {
        if (isScanningFlag) return { icon: faSyncAlt, className: 'status-icon scanning', spin: true };
        switch (status) {
            case 'connected':
                return { icon: faCheckCircle, className: 'status-icon connected' };
            case 'connecting':
            case 'discovering': // Fallthrough for these states
                return { icon: faSyncAlt, className: 'status-icon scanning', spin: true };
            case 'scanning': // Explicitly handle if status itself is 'scanning'
                 return { icon: faSyncAlt, className: 'status-icon scanning', spin: true };
            case 'disconnected':
                return { icon: faTimesCircle, className: 'status-icon disconnected' };
            case 'error':
                return { icon: faExclamationCircle, className: 'status-icon error' };
            default:
                return { icon: faBluetooth, className: 'status-icon neutral' };
        }
    };

    if (!open) return null;

    const isBikeActuallyConnected = bikeStatus === 'connected' && bikeDeviceName;
    const isHrmActuallyConnected = hrStatus === 'connected' && hrDeviceName;

    const bikeButtonStatus = getStatusIconAndClass(bikeStatus, isBikeScanInProgress);
    const hrmButtonStatus = getStatusIconAndClass(hrStatus, isHrmScanInProgress);

    // Determine overall status message and icon
    let overallIcon = faBluetooth;
    let overallClassName = 'status-icon neutral';
    let overallSpin = false;
    let overallMessage = "Connect your Bluetooth devices.";

    if (isBikeScanInProgress || isHrmScanInProgress) {
        overallIcon = faSyncAlt;
        overallClassName = 'status-icon scanning';
        overallSpin = true;
        overallMessage = isBikeScanInProgress ? "Scanning for bike..." : (isHrmScanInProgress ? "Scanning for HRM..." : "Scanning...");
    } else if (bikeStatus === 'connecting' || bikeStatus === 'discovering' || hrStatus === 'connecting' || hrStatus === 'discovering') {
        overallIcon = faSyncAlt;
        overallClassName = 'status-icon scanning'; // Use scanning style
        overallSpin = true;
        overallMessage = bikeStatus === 'connecting' || bikeStatus === 'discovering' ? `Bike: ${bikeStatus}...` : `HRM: ${hrStatus}...`;
    } else if (isBikeActuallyConnected && isHrmActuallyConnected) {
        overallIcon = faCheckCircle;
        overallClassName = 'status-icon connected';
        overallMessage = `Bike & HRM Connected`;
    } else if (isBikeActuallyConnected) {
        overallIcon = faCheckCircle;
        overallClassName = 'status-icon connected-partial';
        overallMessage = `${bikeDeviceName} Connected. HRM?`;
    } else if (isHrmActuallyConnected) {
        overallIcon = faCheckCircle;
        overallClassName = 'status-icon connected-partial';
        overallMessage = `${hrDeviceName} Connected. Bike?`;
    } else if (bikeStatus === 'error' || hrStatus === 'error') {
        overallIcon = faExclamationCircle;
        overallClassName = 'status-icon error';
        overallMessage = bikeStatus === 'error' ? "Bike connection error." : "HRM connection error.";
    }


    // Bike service status (these would need bikePower, bikeCadence etc. passed as props if displayed here)
    // For now, we assume this overlay is primarily for initiating connections.
    // const isTrainerResistanceActive = isBikeActuallyConnected;
    // const isBikePowerActive = isBikeActuallyConnected && passedBikePower > 0;
    // const isBikeCadenceActive = isBikeActuallyConnected && passedBikeCadence > 0;
    // const isBikeHeartRateActive = isBikeActuallyConnected && passedBikeHr > 0;


    return (
        <div className="connection-modal-overlay">
            <div className="connection-modal">
                <header className="connection-modal-header">
                    <h2>Connect Devices</h2>
                    <button className="close-btn" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </header>

                <div className="connection-modal-body">
                    <div className="overall-status-panel">
                        <FontAwesomeIcon icon={overallIcon} className={overallClassName} spin={overallSpin} />
                        <span>{overallMessage}</span>
                    </div>

                    {/* === SMART BIKE / TRAINER SECTION === */}
                    <div className="device-category">
                        <div className="category-header">
                            <FontAwesomeIcon icon={faBicycle} className="category-icon" />
                            <span>SMART BIKE / TRAINER</span>
                            <button
                                className={`connect-button ${isBikeActuallyConnected ? 'disconnect-active' : bikeButtonStatus.className}`}
                                onClick={handleBikeConnectDisconnect}
                                disabled={isBikeScanInProgress || bikeStatus === 'connecting' || bikeStatus === 'discovering'}
                            >
                                <FontAwesomeIcon icon={isBikeActuallyConnected ? faTimes : bikeButtonStatus.icon} spin={bikeButtonStatus.spin && !isBikeActuallyConnected} />
                                {isBikeActuallyConnected ? `Disconnect ${bikeDeviceName}` :
                                 (isBikeScanInProgress ? 'Scanning Bike...' :
                                 (bikeStatus === 'connecting' || bikeStatus === 'discovering' ? `Bike: ${bikeStatus}...` : 'Connect Bike'))}
                            </button>
                        </div>
                        {isBikeActuallyConnected && (
                            <ul className="device-list">
                                <li className="device-item">
                                    <div className="device-info">
                                        <FontAwesomeIcon icon={faBicycle} className={`service-icon active`} />
                                        <span className="device-name">Trainer Control</span>
                                    </div>
                                    <FontAwesomeIcon icon={faCheckCircle} className={`service-status-icon active`} />
                                </li>
                                {/* Add power, cadence, bike HR display here if those props are passed down */}
                            </ul>
                        )}
                        {(!isBikeActuallyConnected && (bikeStatus === 'disconnected' || bikeStatus === 'error') && !isBikeScanInProgress) &&
                            <div className="placeholder-text">
                                {bikeStatus === 'error' ? 'Bike connection error. Try again.' : 'Connect your Smart Bike or Trainer.'}
                            </div>
                        }
                        {((isBikeScanInProgress || bikeStatus === 'connecting' || bikeStatus === 'discovering') && !isBikeActuallyConnected) &&
                            <div className="placeholder-text">
                                <FontAwesomeIcon icon={faSyncAlt} spin /> {bikeStatus === 'connecting' || bikeStatus === 'discovering' ? `Bike: ${bikeStatus}` : 'Searching for bike'}...
                            </div>
                        }
                    </div>

                    {/* === DEDICATED HEART RATE MONITOR SECTION === */}
                    <div className="device-category">
                        <div className="category-header">
                            <FontAwesomeIcon icon={faHeartPulse} className="category-icon" />
                            <span>HEART RATE MONITOR</span>
                             <button
                                className={`connect-button ${isHrmActuallyConnected ? 'disconnect-active' : hrmButtonStatus.className}`}
                                onClick={handleHrmConnectDisconnect}
                                disabled={isHrmScanInProgress || hrStatus === 'connecting' || hrStatus === 'discovering'}
                            >
                                <FontAwesomeIcon icon={isHrmActuallyConnected ? faTimes : hrmButtonStatus.icon} spin={hrmButtonStatus.spin && !isHrmActuallyConnected} />
                                {isHrmActuallyConnected ? `Disconnect ${hrDeviceName}` :
                                 (isHrmScanInProgress ? 'Scanning HRM...' :
                                 (hrStatus === 'connecting' || hrStatus === 'discovering' ? `HRM: ${hrStatus}...` : 'Connect HRM'))}
                            </button>
                        </div>
                        {isHrmActuallyConnected && (
                             <ul className="device-list">
                                <li className="device-item">
                                    <div className="device-info">
                                        <FontAwesomeIcon icon={faHeartPulse} className="service-icon active" />
                                        <span className="device-name">{hrDeviceName}</span>
                                        {hrmHeartRate > 0 && <span className="service-value">{hrmHeartRate} BPM</span>}
                                    </div>
                                    <FontAwesomeIcon icon={faCheckCircle} className="service-status-icon active" />
                                </li>
                            </ul>
                        )}
                        {(!isHrmActuallyConnected && (hrStatus === 'disconnected' || hrStatus === 'error') && !isHrmScanInProgress) &&
                            <div className="placeholder-text">
                                 {hrStatus === 'error' ? 'HRM connection error. Try again.' : 'Connect your Heart Rate Monitor.'}
                            </div>
                        }
                        {((isHrmScanInProgress || hrStatus === 'connecting' || hrStatus === 'discovering') && !isHrmActuallyConnected) &&
                            <div className="placeholder-text">
                                <FontAwesomeIcon icon={faSyncAlt} spin /> {hrStatus === 'connecting' || hrStatus === 'discovering' ? `HRM: ${hrStatus}` : 'Searching for HRM'}...
                            </div>
                        }
                    </div>
                </div>

                <footer className="connection-modal-footer">
                    <button className="done-btn" onClick={onClose} disabled={isBikeScanInProgress || isHrmScanInProgress || bikeStatus === 'connecting' || bikeStatus === 'discovering' || hrStatus === 'connecting' || hrStatus === 'discovering'}>
                        DONE
                    </button>
                </footer>
            </div>
        </div>
    );
}

BluetoothConnectionOverlay.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    // Bike props
    onScanBike: PropTypes.func.isRequired,
    onDisconnectBike: PropTypes.func.isRequired,
    bikeStatus: PropTypes.string.isRequired,
    bikeDeviceName: PropTypes.string,
    // HRM Props
    onHrmConnected: PropTypes.func, // Callback when HRM connection initiated here is successful
    onError: PropTypes.func,        // General error callback
};