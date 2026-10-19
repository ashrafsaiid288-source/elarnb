/**
 * Shared Utilities for CoreInventory
 */

// Format Date as DD-MM-YYYY
function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString('en-GB', {
        day: '2-digit', 
        month: 'short', 
        year: 'numeric'
    });
}

// Generate UUID v4
function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Format Reference (e.g. WH/IN/0001)
function formatReference(typeCode, count, warehouseShortCode = 'WH') {
    const paddedCount = count.toString().padStart(4, '0');
    return `${warehouseShortCode}/${typeCode}/${paddedCount}`;
}

// Show Toast Notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        });
    }, 3000);
}

// Custom Confirm Modal (returns Promise)
function showConfirm(title, message) {
    return new Promise((resolve) => {
        const container = document.getElementById('modal-container');
        if (!container) {
            resolve(window.confirm(`${title}\n\n${message}`));
            return;
        }
        
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal-content';
        
        modal.innerHTML = `
            <div class="modal-header">
                <div>${title}</div>
            </div>
            <div class="modal-body">
                <p>${message}</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
                <button class="btn btn-primary" id="confirm-ok">Confirm</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        container.appendChild(overlay);
        
        document.getElementById('confirm-cancel').addEventListener('click', () => {
            container.removeChild(overlay);
            resolve(false);
        });
        
        document.getElementById('confirm-ok').addEventListener('click', () => {
            container.removeChild(overlay);
            resolve(true);
        });
    });
}

// Empty State Generator
function showEmptyState(containerId, message, ctaText = null, ctaCallback = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let html = `
        <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <p>${message}</p>
    `;
    
    if (ctaText && ctaCallback) {
        // Need to add button and attach listener after HTML injection
        html += `<button id="empty-state-btn" class="btn btn-primary">${ctaText}</button>`;
    }
    
    html += `</div>`;
    container.innerHTML = html;
    
    if (ctaText && ctaCallback) {
        document.getElementById('empty-state-btn').addEventListener('click', ctaCallback);
    }
}

// Loader Toggles
function showLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.remove('hidden');
}

function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('hidden');
}

// Export for other scripts
window.utils = {
    formatDate,
    generateId,
    formatReference,
    showToast,
    showConfirm,
    showEmptyState,
    showLoader,
    hideLoader
};
