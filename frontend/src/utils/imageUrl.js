/**
 * Get the full URL for an uploaded image
 * @param {string} imagePath - The relative path from the backend (e.g., "/uploads/photos/image.jpg")
 * @returns {string} - The full URL to the image
 */
export const getImageUrl = (imagePath) => {
    if (!imagePath) return null;

    // If it's already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }

    // Get backend URL from environment variable
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

    // Remove leading slash from imagePath if present to avoid double slashes
    const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;

    return `${backendUrl}${cleanPath}`;
};

/**
 * Get the backend base URL
 * @returns {string} - The backend base URL
 */
export const getBackendUrl = () => {
    return import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
};
