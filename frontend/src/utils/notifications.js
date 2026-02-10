import Swal from 'sweetalert2';

/**
 * Show loading notification
 * @param {string} message - Loading message
 * @returns {void}
 */
export const showLoading = (message = 'Processing...') => {
    Swal.fire({
        title: message,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
};

/**
 * Show success notification
 * @param {string} title - Success title
 * @param {string} message - Success message
 * @returns {Promise}
 */
export const showSuccess = (title = 'Success!', message = '') => {
    return Swal.fire({
        icon: 'success',
        title: title,
        text: message,
        confirmButtonColor: '#10b981',
        timer: 2000,
        timerProgressBar: true
    });
};

/**
 * Show error notification
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @returns {Promise}
 */
export const showError = (title = 'Error!', message = 'Something went wrong') => {
    return Swal.fire({
        icon: 'error',
        title: title,
        text: message,
        confirmButtonColor: '#ef4444'
    });
};

/**
 * Show confirmation dialog
 * @param {string} title - Confirmation title
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>}
 */
export const showConfirm = (title = 'Are you sure?', message = '') => {
    return Swal.fire({
        icon: 'warning',
        title: title,
        text: message,
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes',
        cancelButtonText: 'Cancel'
    }).then((result) => result.isConfirmed);
};

/**
 * Show info notification
 * @param {string} title - Info title
 * @param {string} message - Info message
 * @returns {Promise}
 */
export const showInfo = (title = 'Information', message = '') => {
    return Swal.fire({
        icon: 'info',
        title: title,
        text: message,
        confirmButtonColor: '#3b82f6'
    });
};

/**
 * Close any open Swal notification
 */
export const closeSwal = () => {
    Swal.close();
};
