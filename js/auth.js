/**
 * Authentication Controller (Login, Signup, OTP, Logout)
 */
document.addEventListener('DOMContentLoaded', () => {
    
    // Auth DOM Elements
    const authScreen = document.getElementById('auth-screen');
    const otpScreen = document.getElementById('otp-screen');
    const appScreen = document.getElementById('app');
    
    const loginCard = document.getElementById('login-card');
    const signupCard = document.getElementById('signup-card');
    
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const btnGoogleLogin = document.getElementById('btn-google-login');
    const btnLogout = document.getElementById('btn-logout');

    const linkSignup = document.getElementById('link-signup');
    const linkLogin = document.getElementById('link-login');
    const linkForgot = document.getElementById('link-forgot-password');

    // OTP Elements
    const otpRequestForm = document.getElementById('otp-request-form');
    const otpVerifyForm = document.getElementById('otp-verify-form');
    const newPasswordForm = document.getElementById('new-password-form');
    const backToLoginLinks = document.querySelectorAll('.back-to-login');
    
    let generatedOtp = null;
    let resetEmail = null;

    // Firebase Auth Listener (Redirect to app if logged in)
    if (window.fbAuth) {
        window.fbAuth.onAuthStateChanged(async (user) => {
            if (user) {
                authScreen.classList.add('hidden');
                otpScreen.classList.add('hidden');
                appScreen.classList.remove('hidden');
                
                // Fetch full user details from firestore
                try {
                    const doc = await window.fbDb.collection('users').doc(user.uid).get();
                    if(doc.exists) {
                        window.currentUser = doc.data();
                    } else {
                        window.currentUser = { name: user.email.split('@')[0], email: user.email };
                    }
                    
                    // Trigger routing to dashboard
                    if(window.appRouter) window.appRouter.loadRoute('dashboard');
                    
                    // Check and run seed script once logged in
                    if(window.seedController) await window.seedController.checkAndSeedDatabase();
                    
                } catch(e) { console.error(e); }
                
            } else {
                authScreen.classList.remove('hidden');
                appScreen.classList.add('hidden');
                otpScreen.classList.add('hidden');
                window.currentUser = null;
            }
        });
    }

    // Toggle Password Visibility Logic
    document.querySelectorAll('.pwd-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const input = btn.previousElementSibling;
            
            // Toggle type
            if (input.type === 'password') {
                input.type = 'text';
                // Eye-off icon (slash outline)
                btn.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>`;
            } else {
                input.type = 'password';
                // Eye icon
                btn.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>`;
            }
        });
    });

    // Toggle Login/Signup Cards
    linkSignup.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.reset(); // clear form
        loginCard.classList.add('hidden');
        signupCard.classList.remove('hidden');
        document.getElementById('signup-login-id').focus();
    });

    linkLogin.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.reset(); // clear form
        signupCard.classList.add('hidden');
        loginCard.classList.remove('hidden');
        document.getElementById('login-id').focus();
    });

    // Login Form Submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!window.fbAuth) return utils.showToast("Firebase disabled", "error");
        
        const loginId = document.getElementById('login-id').value.trim();
        const pwd = document.getElementById('login-password').value;
        const errSpan = document.getElementById('login-error');
        
        errSpan.textContent = '';
        utils.showLoader();

        try {
            // Because Firebase Auth uses email, we map loginId to email using Firestore
            const snapshot = await window.fbDb.collection('users').where('loginId', '==', loginId).limit(1).get();
            if(snapshot.empty) {
                errSpan.textContent = "Invalid Login Id or Password";
                utils.hideLoader();
                return;
            }
            const email = snapshot.docs[0].data().email;
            await window.fbAuth.signInWithEmailAndPassword(email, pwd);
            utils.hideLoader();
        } catch (error) {
            utils.hideLoader();
            errSpan.textContent = "Invalid Login Id or Password";
        }
    });

    // Google Sign-In
    if (btnGoogleLogin) {
        btnGoogleLogin.addEventListener('click', async () => {
            if(!window.fbAuth) return utils.showToast("Firebase disabled", "error");
            
            const provider = new firebase.auth.GoogleAuthProvider();
            utils.showLoader();

            try {
                const result = await window.fbAuth.signInWithPopup(provider);
                const user = result.user;
                
                // Check if user exists in Firestore
                const userDoc = await window.fbDb.collection('users').doc(user.uid).get();
                
                if (!userDoc.exists) {
                    // Create new user record for first-time Google login
                    const newUser = {
                        uid: user.uid,
                        loginId: user.email.split('@')[0], // Use email prefix as default loginId
                        email: user.email,
                        name: user.displayName || user.email.split('@')[0],
                        role: 'User',
                        avatar: user.photoURL || null,
                        createdAt: new Date()
                    };
                    await window.fbDb.collection('users').doc(user.uid).set(newUser);
                    window.currentUser = newUser;
                    utils.showToast(`Welcome, ${newUser.name}!`, "success");
                } else {
                    window.currentUser = userDoc.data();
                    utils.showToast(`Welcome back, ${window.currentUser.name}!`, "success");
                }
                
                utils.hideLoader();
            } catch (error) {
                console.error("Google login error:", error);
                utils.hideLoader();
                // Friendly message for user, details in console
                utils.showToast("Google authentication failed. Please try again.", "error");
            }
        });
    }

    // Signup Form Submit
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!window.fbAuth || !window.fbDb) return;
        
        const loginId = document.getElementById('signup-login-id').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const pwd = document.getElementById('signup-password').value;
        const pwd2 = document.getElementById('signup-confirm-password').value;
        const errSpan = document.getElementById('signup-error');
        
        errSpan.textContent = '';

        // Validations
        if(pwd !== pwd2) return errSpan.textContent = "Passwords do not match.";
        if(pwd.length < 8 || !/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[^a-zA-Z0-9]/.test(pwd)) {
            return errSpan.textContent = "Password must be at least 8 chars, 1 uppercase, 1 lowercase, 1 special char.";
        }

        utils.showLoader();
        try {
            // Check if LoginId exists
            const s1 = await window.fbDb.collection('users').where('loginId', '==', loginId).limit(1).get();
            if(!s1.empty) throw new Error("Login ID already mapped to an account.");

            // Create Firebase Auth User
            const userCredential = await window.fbAuth.createUserWithEmailAndPassword(email, pwd);
            const user = userCredential.user;

            // Write user document to Firestore
            await window.fbDb.collection('users').doc(user.uid).set({
                loginId: loginId,
                email: email,
                name: loginId, // default name to loginId for now
                role: "Inventory Manager",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            utils.hideLoader();
            utils.showToast("Account Created Successfully", "success");
            // AuthState listener will redirect automatically
        } catch (error) {
            utils.hideLoader();
            errSpan.textContent = error.message;
        }
    });

    // Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', async (e) => {
            e.preventDefault();
            const confirmed = await utils.showConfirm("Logout", "Are you sure you want to log out?");
            if (confirmed && window.fbAuth) {
                await window.fbAuth.signOut();
                
                // Clear state
                loginForm.reset();
                signupForm.reset();
                
                utils.showToast("Logged out successfully");
            }
        });
    }

    // --- OTP & FORGOT PASSWORD FLOW ---
    linkForgot.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.reset(); // clear
        otpRequestForm.reset();
        otpVerifyForm.reset();
        newPasswordForm.reset();
        
        authScreen.classList.add('hidden');
        otpScreen.classList.remove('hidden');
        document.getElementById('reset-step-1').classList.remove('hidden');
        document.getElementById('reset-step-2').classList.add('hidden');
        document.getElementById('reset-step-3').classList.add('hidden');
    });

    backToLoginLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            otpScreen.classList.add('hidden');
            authScreen.classList.remove('hidden');
        });
    });

    // Step 1: Send OTP
    otpRequestForm.addEventListener('submit', (e) => {
        e.preventDefault();
        resetEmail = document.getElementById('otp-email').value;
        generatedOtp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit random
        
        utils.showConfirm("Simulated Email", `Your OTP is: ${generatedOtp}\n(In production this would be emailed)`).then(() => {
            document.getElementById('reset-step-1').classList.add('hidden');
            document.getElementById('reset-step-2').classList.remove('hidden');
        });
    });

    // Step 2: Verify OTP
    otpVerifyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputOtp = document.getElementById('otp-code').value;
        if (inputOtp === generatedOtp) {
            document.getElementById('reset-step-2').classList.add('hidden');
            document.getElementById('reset-step-3').classList.remove('hidden');
        } else {
            document.getElementById('otp-error').textContent = "Incorrect OTP. Please try again.";
        }
    });

    // Step 3: Reset Password
    newPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const p1 = document.getElementById('reset-new-password').value;
        const p2 = document.getElementById('reset-confirm-password').value;
        
        if (p1 !== p2) {
            document.getElementById('reset-error').textContent = "Passwords do not match.";
            return;
        }
        
        try {
            utils.showLoader();
            // Note: True password reset via Firebase requires their built-in email flow 
            // `sendPasswordResetEmail`. Since we are using Firebase, we must rely on
            // their secure email system rather than a simulated OTP direct change.
            if(window.fbAuth) {
                await window.fbAuth.sendPasswordResetEmail(resetEmail);
            }
            utils.hideLoader();
            utils.showToast("Cannot directly change password via simulated OTP. A real secure Firebase reset link has been sent to " + resetEmail, "info");
            
            // Go back to login
            otpScreen.classList.add('hidden');
            authScreen.classList.remove('hidden');
            
            // Clear forms
            loginForm.reset();
            otpRequestForm.reset();
            otpVerifyForm.reset();
            newPasswordForm.reset();
        } catch (error) {
            utils.hideLoader();
            document.getElementById('reset-error').textContent = error.message;
        }
    });
});
