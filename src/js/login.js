/**
 * Shadow Heist Online - Login Page Handler
 * Handles login and registration page functionality
 */

// Login Handler
(function() {
    'use strict';
    
    // Check if we're on a login or register page
    const isLoginPage = window.location.pathname.includes('login.html');
    const isRegisterPage = window.location.pathname.includes('register.html');
    
    // Only run on login or register pages
    if (!isLoginPage && !isRegisterPage) return;
    
    // DOM elements
    let authError = null;
    
    // Initialize
    function init() {
        console.log(`Initializing ${isLoginPage ? 'login' : 'register'} page`);
        
        // Get error element
        authError = document.getElementById('auth-error');
        
        // Set page direction for Arabic
        document.documentElement.dir = 'rtl';
        
        // Add localization for Clerk
        setClerkLocalization();
        
        // Check if user is already logged in
        checkAuthState();
        
        // Add event listeners
        addEventListeners();
    }
    
    /**
     * Set Clerk localization
     */
    function setClerkLocalization() {
        // Set Clerk localization for Arabic when Clerk is available
        if (window.Clerk) {
            window.Clerk.load({
                localization: {
                    socialButtonsBlockButton: "{{provider}} متابعة باستخدام",
                    dividerText: "أو",
                    formFieldLabel__emailAddress: "البريد الإلكتروني",
                    formFieldLabel__password: "كلمة المرور",
                    formButtonPrimary: isLoginPage ? "تسجيل الدخول" : "إنشاء حساب",
                    signIn: {
                        start: {
                            title: "تسجيل الدخول",
                            subtitle: "قم بتسجيل الدخول للوصول إلى حسابك",
                            actionText: "لا تملك حساب؟",
                            actionLink: "إنشاء حساب"
                        }
                    },
                    signUp: {
                        start: {
                            title: "إنشاء حساب",
                            subtitle: "قم بالتسجيل للانضمام إلى المهمات",
                            actionText: "لديك حساب بالفعل؟",
                            actionLink: "تسجيل الدخول"
                        }
                    }
                }
            });
        } else {
            // Clerk not loaded yet, wait and try again
            setTimeout(setClerkLocalization, 500);
        }
    }
    
    /**
     * Check if user is already authenticated
     */
    function checkAuthState() {
        // Listen for auth initialization
        document.addEventListener('auth-initialized', (e) => {
            const { user } = e.detail;
            
            if (user && (isLoginPage || isRegisterPage)) {
                // User is already logged in, redirect to game
                window.location.href = 'game.html';
            }
        });
    }
    
    /**
     * Add event listeners for the page
     */
    function addEventListeners() {
        // Custom auth errors from Clerk
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check for Clerk error elements
                    const clerkErrors = document.querySelectorAll('.cl-formButtonPrimary-errorText');
                    if (clerkErrors.length > 0) {
                        clerkErrors.forEach(error => {
                            showError(error.textContent);
                        });
                    }
                }
            });
        });
        
        // Start observing the document with the configured parameters
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    function showError(message) {
        if (!authError) return;
        
        authError.textContent = message;
        authError.classList.add('show');
        
        // Hide after 5 seconds
        setTimeout(() => {
            authError.classList.remove('show');
        }, 5000);
    }
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);
})(); 