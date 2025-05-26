// src/utils/rideAnalysis.js

/**
 * Calculates the 30-second rolling average for a data series.
 * Assumes data points are relatively evenly spaced.
 * For robustness, a timestamp-based window would be better if data points are irregular.
 * @param {Array<{value: number, time: number}>} data - Array of data points with value and timestamp.
 * @param {number} windowSeconds - The window size in seconds for the rolling average.
 * @param {number} dataIntervalSeconds - The interval at which data points are typically recorded.
 * @returns {Array<number>} - Array of rolling average values.
 */
function calculateRollingAverage(data, windowSeconds = 30, dataIntervalSeconds = 2) {
    if (!data || data.length === 0) return [];
    const windowSize = Math.max(1, Math.round(windowSeconds / dataIntervalSeconds));
    const rollingAverages = [];
    let currentSum = 0;
    const currentWindow = [];

    for (let i = 0; i < data.length; i++) {
        currentSum += data[i].value;
        currentWindow.push(data[i].value);
        if (i >= windowSize) {
            currentSum -= currentWindow.shift();
            rollingAverages.push(currentSum / windowSize);
        } else if (i === data.length - 1 && data.length < windowSize) {
            // Handle cases where total data is less than window size
            rollingAverages.push(currentSum / currentWindow.length);
        } else if (i >= windowSize -1 ) { // Start pushing averages once window is full
             rollingAverages.push(currentSum / windowSize);
        }
    }
    // If no averages were pushed because data length < windowSize,
    // use the average of all available data as a single point.
    if (rollingAverages.length === 0 && currentWindow.length > 0) {
        rollingAverages.push(currentSum / currentWindow.length);
    }
    return rollingAverages;
}

/**
 * Calculates Normalized Power (NP).
 * @param {Array<{value: number, time: number}>} powerData - Array of power data points.
 * @returns {number} - Normalized Power in watts, or 0 if not enough data.
 */
export function calculateNormalizedPower(powerData) {
    if (!powerData || powerData.length < 15) { // Need at least 30s of data for a single rolling average point
        // Fallback to average power if not enough data for NP
        if (powerData && powerData.length > 0) {
            return powerData.reduce((sum, p) => sum + p.value, 0) / powerData.length;
        }
        return 0;
    }

    const rollingAvgPower = calculateRollingAverage(powerData);
    if (rollingAvgPower.length === 0) {
         // Fallback if rolling average calculation fails or yields no results
        if (powerData && powerData.length > 0) {
            return powerData.reduce((sum, p) => sum + p.value, 0) / powerData.length;
        }
        return 0;
    }

    const fourthPowerAvg = rollingAvgPower.reduce((sum, p) => sum + Math.pow(p, 4), 0) / rollingAvgPower.length;
    return Math.round(Math.pow(fourthPowerAvg, 0.25));
}

/**
 * Calculates Intensity Factor (IF).
 * @param {number} normalizedPower - Normalized Power in watts.
 * @param {number} ftp - Functional Threshold Power in watts.
 * @returns {number} - Intensity Factor, or 0 if FTP is invalid.
 */
export function calculateIntensityFactor(normalizedPower, ftp) {
    if (!ftp || ftp <= 0) return 0;
    return parseFloat((normalizedPower / ftp).toFixed(2));
}

/**
 * Calculates Training Stress Score (TSS).
 * @param {number} durationSeconds - Total duration of the workout in seconds.
 * @param {number} normalizedPower - Normalized Power in watts.
 * @param {number} intensityFactor - Intensity Factor.
 * @param {number} ftp - Functional Threshold Power in watts.
 * @returns {number} - Training Stress Score, or 0 if inputs are invalid.
 */
export function calculateTSS(durationSeconds, normalizedPower, intensityFactor, ftp) {
    if (!durationSeconds || durationSeconds <= 0 || !normalizedPower || !intensityFactor || !ftp || ftp <= 0) return 0;
    const durationHours = durationSeconds / 3600;
    return Math.round((durationHours * normalizedPower * intensityFactor * 100) / ftp);
}

/**
 * Calculates total calories burned based on average power and duration.
 * Assumes a gross metabolic efficiency of ~24%.
 * Formula: Calories = AvgPower (watts) * Duration (seconds) / 1000 (kJ/s to kJ) / 4.184 (kJ/kcal) / efficiency
 * Simplified: AvgPower * DurationSeconds / (1000 * 0.24) = AvgPower * DurationSeconds / 240 (approx)
 * Using a common factor: AvgPower * DurationHours * 3.6 (kJ per Wh) * (1/efficiency)
 * AvgPower (W) * Duration (s) * (1 J/s / 1 W) * (1 kJ / 1000 J) * (1 kcal / 4.184 kJ) * (1 / 0.24 efficiency)
 * = AvgPower * Duration / 1000 / 4.184 / 0.24
 * = AvgPower * Duration / 992.16
 * @param {number} averagePower - Average power in watts for the workout.
 * @param {number} durationSeconds - Total duration of the workout in seconds.
 * @returns {number} - Estimated total calories burned.
 */
export function calculateTotalCalories(averagePower, durationSeconds) {
    if (averagePower <= 0 || durationSeconds <= 0) return 0;
    // const kj = averagePower * durationSeconds / 1000;
    // const efficiency = 0.24; // Typical cycling efficiency
    // return Math.round(kj / 4.184 / efficiency);
    // Simpler: Average Power (watts) * Time (hours) * 3.6 (conversion factor for Wh to kJ, then kcal implies efficiency)
    // Standard rough estimate: Avg Power * duration (hours) * 3.6  (This is kJ if efficiency was 100%, often used loosely for kcal)
    // More direct: AvgPower * DurationInSeconds / 1000 (for kJ) then apply efficiency.
    // work_joules = avg_power_watts * duration_seconds
    // work_kcal = work_joules / 4184 (joules per kcal)
    // total_kcal_expended = work_kcal / efficiency (e.g. 0.20 to 0.25)
    const workKcal = (averagePower * durationSeconds) / 4184;
    const efficiency = 0.24; // Assume 24% efficiency
    return Math.round(workKcal / efficiency);
}


/**
 * Calculates a comprehensive summary of the ride.
 * @param {Array<{value: number, time: number}>} powerData - Array of power data points.
 * @param {Array<{value: number, time: number}>} hrData - Array of heart rate data points.
 * @param {Array<{value: number, time: number}>} cadenceData - Array of cadence data points.
 * @param {number} durationSeconds - Total duration of the workout in seconds.
 * @param {number} ftp - User's Functional Threshold Power.
 * @param {number} initialCalories - Initial estimate of calories (can be refined).
 * @returns {object} - An object containing detailed ride metrics.
 */
export function calculateRideSummary(powerData, hrData, cadenceData, durationSeconds, ftp, initialCalories = 0) {
    const summary = {
        duration: durationSeconds,
        avgPower: 0,
        maxPower: 0,
        normalizedPower: 0,
        intensityFactor: 0,
        tss: 0,
        avgHr: 0,
        maxHr: 0,
        avgCadence: 0,
        maxCadence: 0,
        totalCalories: initialCalories, // Will be recalculated
    };

    if (powerData && powerData.length > 0) {
        summary.avgPower = Math.round(powerData.reduce((sum, p) => sum + p.value, 0) / powerData.length);
        summary.maxPower = Math.round(powerData.reduce((max, p) => Math.max(max, p.value), 0));
        summary.normalizedPower = calculateNormalizedPower(powerData); // Use the raw powerData array
        summary.intensityFactor = calculateIntensityFactor(summary.normalizedPower, ftp);
        summary.tss = calculateTSS(durationSeconds, summary.normalizedPower, summary.intensityFactor, ftp);
        summary.totalCalories = calculateTotalCalories(summary.avgPower, durationSeconds);
    }

    if (hrData && hrData.length > 0) {
        const validHrData = hrData.filter(hr => hr.value > 0);
        if (validHrData.length > 0) {
            summary.avgHr = Math.round(validHrData.reduce((sum, p) => sum + p.value, 0) / validHrData.length);
            summary.maxHr = Math.round(validHrData.reduce((max, p) => Math.max(max, p.value), 0));
        }
    }

    if (cadenceData && cadenceData.length > 0) {
        const validCadenceData = cadenceData.filter(c => c.value > 0);
         if (validCadenceData.length > 0) {
            summary.avgCadence = Math.round(validCadenceData.reduce((sum, p) => sum + p.value, 0) / validCadenceData.length);
            summary.maxCadence = Math.round(validCadenceData.reduce((max, p) => Math.max(max, p.value), 0));
         }
    }
    return summary;
}