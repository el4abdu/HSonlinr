/**
 * Shadow Heist Online - UI Components & Animations
 * Modern user interface elements and advanced animations
 */

// UI Components and Animation Module
const ShadowHeistUI = (function() {
    // Animation durations and delays
    const ANIMATION = {
        FAST: 150,
        NORMAL: 300,
        SLOW: 500,
        VERY_SLOW: 1000
    };

    // UI elements cache
    let elements = {};
    let tooltips = [];

    /**
     * Initialize UI components
     */
    function init() {
        cacheElements();
        setupEventListeners();
        initializeTooltips();
        initializeParticles();
        setupDragAndDrop();
        setupParallaxEffect();
    }

    /**
     * Cache DOM elements for better performance
     */
    function cacheElements() {
        // Common elements
        elements.body = document.body;
        elements.loaders = document.querySelectorAll('.loading-spinner');
        elements.buttons = document.querySelectorAll('.btn, .button, button:not(.plain-button)');
        elements.dropdowns = document.querySelectorAll('.dropdown');
        elements.modals = document.querySelectorAll('.modal');
        elements.tooltipElements = document.querySelectorAll('[data-tooltip]');
        elements.cards = document.querySelectorAll('.card, .dashboard-card, .mode-card, .map-card');
        elements.parallaxElements = document.querySelectorAll('.parallax');
        elements.dragElements = document.querySelectorAll('[data-draggable="true"]');
        elements.notificationContainer = document.getElementById('notification-container');
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Button hover effects
        elements.buttons.forEach(button => {
            button.addEventListener('mouseenter', addButtonHoverEffect);
            button.addEventListener('mouseleave', removeButtonHoverEffect);
            button.addEventListener('click', addButtonClickEffect);
        });

        // Dropdown toggle
        elements.dropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector('.dropdown-toggle');
            if (toggle) {
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleDropdown(dropdown);
                });
            }
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', closeAllDropdowns);

        // Card hover effects
        elements.cards.forEach(card => {
            card.addEventListener('mouseenter', addCardHoverEffect);
            card.addEventListener('mouseleave', removeCardHoverEffect);
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeAllModals();
            }
        });

        // Close modal when clicking on backdrop
        elements.modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(modal);
                }
            });
        });
    }

    /**
     * Initialize tooltips
     */
    function initializeTooltips() {
        elements.tooltipElements.forEach(element => {
            const tooltipText = element.getAttribute('data-tooltip');
            const position = element.getAttribute('data-tooltip-position') || 'top';
            
            element.addEventListener('mouseenter', () => {
                showTooltip(element, tooltipText, position);
            });
            
            element.addEventListener('mouseleave', () => {
                hideTooltip(element);
            });
        });
    }

    /**
     * Show tooltip
     * @param {HTMLElement} element - Element to show tooltip for
     * @param {string} text - Tooltip text
     * @param {string} position - Tooltip position (top, bottom, left, right)
     */
    function showTooltip(element, text, position) {
        // Remove any existing tooltip for this element
        hideTooltip(element);
        
        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = `tooltip tooltip-${position}`;
        tooltip.textContent = text;
        
        // Add to document
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const elementRect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top, left;
        
        switch (position) {
            case 'top':
                top = elementRect.top - tooltipRect.height - 10;
                left = elementRect.left + (elementRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'bottom':
                top = elementRect.bottom + 10;
                left = elementRect.left + (elementRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'left':
                top = elementRect.top + (elementRect.height / 2) - (tooltipRect.height / 2);
                left = elementRect.left - tooltipRect.width - 10;
                break;
            case 'right':
                top = elementRect.top + (elementRect.height / 2) - (tooltipRect.height / 2);
                left = elementRect.right + 10;
                break;
        }
        
        // Adjust to keep tooltip within viewport
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top < 10) top = 10;
        if (top + tooltipRect.height > window.innerHeight - 10) {
            top = window.innerHeight - tooltipRect.height - 10;
        }
        
        tooltip.style.top = `${top + window.scrollY}px`;
        tooltip.style.left = `${left + window.scrollX}px`;
        
        // Add to tooltips array with reference to element
        tooltips.push({
            element: element,
            tooltip: tooltip
        });
        
        // Animate in
        setTimeout(() => {
            tooltip.classList.add('show');
        }, 10);
    }

    /**
     * Hide tooltip for specific element
     * @param {HTMLElement} element - Element to hide tooltip for
     */
    function hideTooltip(element) {
        const tooltipObject = tooltips.find(t => t.element === element);
        
        if (tooltipObject) {
            const tooltip = tooltipObject.tooltip;
            
            // Animate out
            tooltip.classList.remove('show');
            
            // Remove after animation
            setTimeout(() => {
                if (document.body.contains(tooltip)) {
                    document.body.removeChild(tooltip);
                }
                tooltips = tooltips.filter(t => t.element !== element);
            }, ANIMATION.NORMAL);
        }
    }

    /**
     * Initialize particles for background effects
     */
    function initializeParticles() {
        const container = document.querySelector('.particles-container');
        if (!container) return;
        
        // Clear existing particles
        container.innerHTML = '';
        
        // Create particles
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Random position
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            
            // Random size
            const size = Math.random() * 5 + 1;
            
            // Random animation duration and delay
            const duration = Math.random() * 20 + 10;
            const delay = Math.random() * 10;
            
            // Random opacity
            const opacity = Math.random() * 0.5 + 0.1;
            
            // Set styles
            particle.style.left = `${x}%`;
            particle.style.top = `${y}%`;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.opacity = opacity;
            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `${delay}s`;
            
            container.appendChild(particle);
        }
    }

    /**
     * Set up parallax effect for elements
     */
    function setupParallaxEffect() {
        // If no parallax elements, return
        if (!elements.parallaxElements.length) return;
        
        // Add mousemove event to handle parallax
        document.addEventListener('mousemove', (e) => {
            const x = e.clientX / window.innerWidth;
            const y = e.clientY / window.innerHeight;
            
            elements.parallaxElements.forEach(element => {
                const speed = element.getAttribute('data-parallax-speed') || 30;
                const moveX = (x - 0.5) * speed;
                const moveY = (y - 0.5) * speed;
                
                element.style.transform = `translate(${moveX}px, ${moveY}px)`;
            });
        });
    }

    /**
     * Set up drag and drop functionality
     */
    function setupDragAndDrop() {
        elements.dragElements.forEach(element => {
            element.setAttribute('draggable', true);
            
            let startX, startY, startLeft, startTop;
            let dragTarget = null;
            
            element.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return; // Only left mouse button
                
                dragTarget = element;
                
                // Get initial position
                const rect = element.getBoundingClientRect();
                startX = e.clientX;
                startY = e.clientY;
                startLeft = parseInt(element.style.left || 0);
                startTop = parseInt(element.style.top || 0);
                
                // Add dragging class
                element.classList.add('dragging');
                
                // Prevent text selection
                e.preventDefault();
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!dragTarget) return;
                
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                dragTarget.style.left = `${startLeft + deltaX}px`;
                dragTarget.style.top = `${startTop + deltaY}px`;
            });
            
            document.addEventListener('mouseup', () => {
                if (!dragTarget) return;
                
                dragTarget.classList.remove('dragging');
                dragTarget = null;
            });
        });
    }

    /**
     * Add hover effect to button
     * @param {Event} e - The mouseenter event
     */
    function addButtonHoverEffect(e) {
        const button = e.currentTarget;
        button.classList.add('hover');
        
        // Ripple effect setup
        if (!button.querySelector('.ripple-container')) {
            const rippleContainer = document.createElement('div');
            rippleContainer.className = 'ripple-container';
            button.appendChild(rippleContainer);
        }
    }

    /**
     * Remove hover effect from button
     * @param {Event} e - The mouseleave event
     */
    function removeButtonHoverEffect(e) {
        const button = e.currentTarget;
        button.classList.remove('hover');
    }

    /**
     * Add click effect to button (ripple)
     * @param {Event} e - The click event
     */
    function addButtonClickEffect(e) {
        const button = e.currentTarget;
        const rippleContainer = button.querySelector('.ripple-container');
        
        if (rippleContainer) {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            rippleContainer.appendChild(ripple);
            
            // Remove ripple after animation
            setTimeout(() => {
                if (rippleContainer.contains(ripple)) {
                    rippleContainer.removeChild(ripple);
                }
            }, 1000);
        }
    }

    /**
     * Add hover effect to card
     * @param {Event} e - The mouseenter event
     */
    function addCardHoverEffect(e) {
        const card = e.currentTarget;
        card.classList.add('hover');
        
        // 3D tilt effect for cards
        card.addEventListener('mousemove', applyTiltEffect);
    }

    /**
     * Remove hover effect from card
     * @param {Event} e - The mouseleave event
     */
    function removeCardHoverEffect(e) {
        const card = e.currentTarget;
        card.classList.remove('hover');
        
        // Reset transform
        card.style.transform = '';
        
        // Remove mousemove listener
        card.removeEventListener('mousemove', applyTiltEffect);
    }

    /**
     * Apply 3D tilt effect to card
     * @param {Event} e - The mousemove event
     */
    function applyTiltEffect(e) {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const angleX = ((y - centerY) / centerY) * 10;
        const angleY = ((centerX - x) / centerX) * 10;
        
        card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg)`;
    }

    /**
     * Toggle dropdown visibility
     * @param {HTMLElement} dropdown - The dropdown element
     */
    function toggleDropdown(dropdown) {
        const isOpen = dropdown.classList.contains('open');
        
        // Close all dropdowns first
        elements.dropdowns.forEach(d => d.classList.remove('open'));
        
        // Open this dropdown if it was closed
        if (!isOpen) {
            dropdown.classList.add('open');
        }
    }

    /**
     * Close all dropdowns
     */
    function closeAllDropdowns() {
        elements.dropdowns.forEach(dropdown => {
            dropdown.classList.remove('open');
        });
    }

    /**
     * Show a modal
     * @param {HTMLElement|string} modal - The modal element or its ID
     */
    function showModal(modal) {
        if (typeof modal === 'string') {
            modal = document.getElementById(modal);
        }
        
        if (!modal) return;
        
        // Hide any open modals
        closeAllModals();
        
        // Add active class
        modal.classList.add('active');
        
        // Prevent body scrolling
        elements.body.classList.add('modal-open');
    }

    /**
     * Close a modal
     * @param {HTMLElement|string} modal - The modal element or its ID
     */
    function closeModal(modal) {
        if (typeof modal === 'string') {
            modal = document.getElementById(modal);
        }
        
        if (!modal) return;
        
        // Remove active class
        modal.classList.remove('active');
        
        // Allow body scrolling if no other modals are open
        const openModals = document.querySelectorAll('.modal.active');
        if (openModals.length === 0) {
            elements.body.classList.remove('modal-open');
        }
    }

    /**
     * Close all modals
     */
    function closeAllModals() {
        elements.modals.forEach(modal => {
            modal.classList.remove('active');
        });
        
        // Allow body scrolling
        elements.body.classList.remove('modal-open');
    }

    /**
     * Show a notification
     * @param {string} message - The notification message
     * @param {string} type - Notification type (success, error, warning, info)
     * @param {number} duration - How long to display the notification (ms)
     */
    function showNotification(message, type = 'info', duration = 5000) {
        if (!elements.notificationContainer) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Icon based on type
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        if (type === 'error') icon = 'exclamation-circle';
        
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="notification-message">${message}</div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add notification to container
        elements.notificationContainer.appendChild(notification);
        
        // Add close functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.animation = 'notificationSlideOut 0.3s forwards';
            setTimeout(() => {
                if (elements.notificationContainer.contains(notification)) {
                    elements.notificationContainer.removeChild(notification);
                }
            }, 300);
        });
        
        // Auto-remove after duration
        setTimeout(() => {
            if (elements.notificationContainer.contains(notification)) {
                notification.style.animation = 'notificationSlideOut 0.3s forwards';
                setTimeout(() => {
                    if (elements.notificationContainer.contains(notification)) {
                        elements.notificationContainer.removeChild(notification);
                    }
                }, 300);
            }
        }, duration);
    }

    /**
     * Show a loading spinner in an element
     * @param {HTMLElement|string} container - The container element or its ID
     * @param {string} size - Size of the spinner (small, medium, large)
     * @param {string} color - Color of the spinner (primary, secondary, white)
     */
    function showSpinner(container, size = 'medium', color = 'primary') {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (!container) return;
        
        // Add loading class to container
        container.classList.add('loading');
        
        // Create spinner
        const spinner = document.createElement('div');
        spinner.className = `loading-spinner ${size} ${color}`;
        spinner.innerHTML = `<div class="spinner-inner"></div>`;
        
        // Save original content
        if (!container.dataset.originalContent) {
            container.dataset.originalContent = container.innerHTML;
        }
        
        // Replace content with spinner
        container.innerHTML = '';
        container.appendChild(spinner);
    }

    /**
     * Hide loading spinner and restore original content
     * @param {HTMLElement|string} container - The container element or its ID
     */
    function hideSpinner(container) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (!container) return;
        
        // Restore original content if available
        if (container.dataset.originalContent) {
            container.innerHTML = container.dataset.originalContent;
            delete container.dataset.originalContent;
        } else {
            // Just remove spinner
            const spinner = container.querySelector('.loading-spinner');
            if (spinner) {
                container.removeChild(spinner);
            }
        }
        
        // Remove loading class
        container.classList.remove('loading');
    }

    // Public API
    return {
        init,
        showModal,
        closeModal,
        closeAllModals,
        showNotification,
        showSpinner,
        hideSpinner,
        showTooltip,
        hideTooltip,
        initializeParticles,
        
        // Animation constants
        ANIMATION
    };
})();

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    ShadowHeistUI.init();
    
    // Make UI available globally
    window.ShadowHeistUI = ShadowHeistUI;
}); 