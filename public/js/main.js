// VulnNode Shop - Main JavaScript

// Show alert message
function showAlert(type, message) {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    alertContainer.innerHTML = alertHtml;
    
    // Auto dismiss after 3 seconds
    setTimeout(() => {
        const alert = alertContainer.querySelector('.alert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 3000);
}

// Load cart count (only on pages with cart-count element)
function loadCartCount() {
    const cartCountElement = document.getElementById('cart-count');
    if (!cartCountElement) return;
    
    fetch('/api/cart')
        .then(res => {
            if (!res.ok) throw new Error('Cart API failed');
            return res.json();
        })
        .then(data => {
            if (data.items && Array.isArray(data.items)) {
                const count = data.items.reduce((sum, item) => sum + item.quantity, 0);
                cartCountElement.textContent = count;
            }
        })
        .catch(err => {
            console.error('Cart load error:', err);
            // Don't show error to user, just set to 0
            cartCountElement.textContent = '0';
        });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Only load cart count if element exists
    if (document.getElementById('cart-count')) {
        loadCartCount();
    }
    
    console.log('VulnNode Shop loaded successfully');
});