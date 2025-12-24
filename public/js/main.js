// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    console.log("[*] VulnNode Client Scripts Loaded");

    // ============================================================
    // VULNERABILITY: DOM-BASED XSS
    // ============================================================
    // We look for a hash parameter 'welcome' to display a personalized greeting.
    // Exploitation: http://localhost:3000/#welcome=<img src=x onerror=alert(1)>
    
    function checkWelcomeMessage() {
        const hash = decodeURIComponent(window.location.hash.substring(1)); // Remove '#'
        const params = new URLSearchParams(hash);
        
        if (params.has('welcome')) {
            const welcomeMsg = params.get('welcome');
            const welcomeContainer = document.getElementById('welcome-message');
            
            if (welcomeContainer) {
                // VULNERABILITY: using innerHTML with unsanitized input
                welcomeContainer.innerHTML = `<div class="alert alert-success">Welcome back, ${welcomeMsg}!</div>`;
            } else {
                // Create container if it doesn't exist (e.g., on home page)
                const container = document.createElement('div');
                container.id = 'welcome-message';
                container.className = 'container mt-3';
                container.innerHTML = `<div class="alert alert-success">Welcome back, ${welcomeMsg}!</div>`;
                
                // Prepend to body or main container
                const nav = document.querySelector('nav');
                nav.parentNode.insertBefore(container, nav.nextSibling);
            }
        }
    }

    // Run on load and hash change
    checkWelcomeMessage();
    window.addEventListener('hashchange', checkWelcomeMessage);

    // ============================================================
    // UTILITY: Fake Chat Widget
    // ============================================================
    // Just for flavor, but could be a target for social engineering scenarios
    const chatHeader = document.getElementById('chat-header');
    if (chatHeader) {
        chatHeader.addEventListener('click', () => {
            const body = document.getElementById('chat-body');
            body.style.display = body.style.display === 'none' ? 'block' : 'none';
        });
    }
});