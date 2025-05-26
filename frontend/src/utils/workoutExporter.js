// src/utils/workoutExporter.js

/**
 * Converts workout summary data to a CSV string.
 * @param {object} workoutHistoryItem - An item from the workoutHistory array.
 * @returns {string} - CSV formatted string.
 */
export function exportWorkoutSummaryToCSV(workoutHistoryItem) {
    if (!workoutHistoryItem || !workoutHistoryItem.metrics) return '';

    const metrics = workoutHistoryItem.metrics;
    const headers = [
        'WorkoutName', 'Date', 'Duration(s)',
        'AvgPower(W)', 'MaxPower(W)', 'NormalizedPower(W)', 'IF', 'TSS',
        'AvgHR(bpm)', 'MaxHR(bpm)', 'AvgCadence(rpm)', 'MaxCadence(rpm)', 'TotalCalories'
    ];
    const row = [
        workoutHistoryItem.workoutName || 'N/A',
        workoutHistoryItem.date ? new Date(workoutHistoryItem.date).toLocaleString() : 'N/A',
        metrics.duration || 0,
        metrics.avgPower || 0,
        metrics.maxPower || 0,
        metrics.normalizedPower || 0,
        metrics.intensityFactor || 0,
        metrics.tss || 0,
        metrics.avgHr || 0,
        metrics.maxHr || 0,
        metrics.avgCadence || 0,
        metrics.maxCadence || 0,
        metrics.totalCalories || 0
    ];

    return headers.join(',') + '\n' + row.join(',');
}

/**
 * Triggers a download of the provided text data.
 * @param {string} dataString - The string data to download.
 * @param {string} filename - The desired filename for the download.
 * @param {string} type - The MIME type of the file (e.g., 'text/csv').
 */
export function downloadFile(dataString, filename, type = 'text/csv;charset=utf-8;') {
    const blob = new Blob([dataString], { type });
    const link = document.createElement('a');
    if (link.download !== undefined) { // feature detection
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else {
        alert("Your browser doesn't support direct file downloads. Please copy the data manually.");
        // Optionally, display the data in a modal for copying.
        console.log("Data for " + filename + ":\n" + dataString);
    }
}

// Example for future: Exporting time series data
/*
export function exportFullWorkoutToCSV(workoutHistoryItem, powerSeries, hrSeries, cadenceSeries) {
    // ... implementation to combine summary with time series data ...
    // Each row could be: timestamp, power, hr, cadence
}
*/