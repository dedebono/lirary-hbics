/**
 * Formats a date string or Date object to 'dd/mm/yyyy'.
 * @param {string|Date} date - The date to format.
 * @returns {string} - The formatted date string (e.g., "18/02/2026").
 */
// Helper to ensure date is treated as UTC if it lacks timezone info (common with SQLite)
export const ensureUtc = (date) => {
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date)) {
        return date + 'Z';
    }
    return date;
};

export const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(ensureUtc(date));
    if (isNaN(d.getTime())) return ''; // Handle invalid dates

    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Makassar'
    });
};

/**
 * Formats a date string or Date object to 'dd/mm/yyyy hh:mm:ss'.
 * @param {string|Date} date - The date to format.
 * @returns {string} - The formatted date and time string.
 */
export const formatDateTime = (date) => {
    if (!date) return '';
    const d = new Date(ensureUtc(date));
    if (isNaN(d.getTime())) return '';

    return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Makassar'
    });
};
