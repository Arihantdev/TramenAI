import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// --- PASTE THIS FIREBASE LINK CHECK HERE (Before render) ---
import { getAuth, isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";

const auth = getAuth();

if (isSignInWithEmailLink(auth, window.location.href)) {
  let email = window.localStorage.getItem('emailForSignIn');
  
  if (!email) {
    email = window.prompt('Please provide your email for confirmation to complete sign-in:');
  }

  signInWithEmailLink(auth, email, window.location.href)
    .then((result) => {
      window.localStorage.removeItem('emailForSignIn');
      console.log("Successfully signed in!", result.user);
      alert("Successfully signed in!");
      window.history.replaceState({}, document.title, window.location.pathname);
    })
    .catch((error) => {
      console.error("Error completing sign-in with email link:", error.message);
      alert("Error logging in: " + error.message);
    });
}
// -------------------------------------------------------------

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)