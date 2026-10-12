import { useState } from 'react';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { BookOpen, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from 'lucide-react';

function friendlyError(error) {
  const messages = {
    'auth/email-already-in-use': 'Indha email-ku account already irukku. Sign in pannunga.',
    'auth/invalid-credential': 'Email/password sariyaa nu check pannunga.',
    'auth/invalid-email': 'Valid email address enter pannunga.',
    'auth/weak-password': 'Password at least 6 characters irukkanum.',
    'auth/too-many-requests': 'Neraya attempts aagiduchu. Konjam neram kazhichu try pannunga.',
    'auth/network-request-failed': 'Network connection check pannitu retry pannunga.',
    'auth/popup-closed-by-user': 'Google sign-in window close aayiduchu. Marubadi try pannunga.',
    'auth/popup-blocked': 'Browser popup block panniduchu. Popups allow pannitu try pannunga.',
    'auth/operation-not-allowed': 'Firebase Console-la Google sign-in provider enable pannunga.',
  };
  return messages[error.code] || 'Login panna mudiyala. Details check pannitu marubadi try pannunga.';
}

export default function AuthScreen({ auth, configured, onGuest }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!configured || busy) return;
    setBusy(true);
    setError('');
    try {
      if (isSignup) await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (authError) {
      setError(friendlyError(authError));
    } finally {
      setBusy(false);
    }
  }

  async function continueWithGoogle() {
    if (!configured || busy) return;
    setBusy(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (authError) {
      setError(friendlyError(authError));
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-screen">
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="auth-brand"><span><Sparkles size={19}/></span>Study Master</div>
      <div className="auth-icon"><BookOpen size={22}/></div>
      <p className="eyebrow">YOUR PERSONAL LEARNING SPACE</p>
      <h1 id="auth-title">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
      <p className="auth-copy">{isSignup ? 'Account create pannitu learning start pannunga.' : 'Sign in pannitu learning continue pannunga.'}</p>

      {!configured && <div className="auth-setup" role="status">
        <strong>Firebase setup pending</strong>
        <p>Firebase Console-la Email/Password sign-in enable panni, Vercel project-ku Firebase web config environment variables add pannina login work aagum.</p>
      </div>}

      {configured && <>
      <button className="google-submit" type="button" onClick={continueWithGoogle} disabled={busy}>
        <svg aria-hidden="true" viewBox="0 0 48 48" width="18" height="18"><path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/><path fill="#4A90E2" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 6 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z"/></svg>
        {busy ? 'Connecting…' : 'Continue with Google'}
      </button>
      <div className="auth-divider"><span>or continue with email</span></div>
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="auth-email">Email address</label>
        <div className="auth-input"><Mail size={17}/><input id="auth-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com"/></div>
        <label htmlFor="auth-password">Password</label>
        <div className="auth-input"><LockKeyhole size={17}/><input id="auth-password" type={showPassword ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={6} required value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 6 characters"/><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="auth-submit" disabled={busy}>{busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}</button>
        <p className="auth-switch">{isSignup ? 'Already account irukka?' : 'Account illaya?'} <button type="button" onClick={() => { setIsSignup(value => !value); setError(''); }}> {isSignup ? 'Sign in' : 'Create account'}</button></p>
      </form></>}
      {!configured && <button className="auth-submit guest-submit" onClick={onGuest}>Continue as guest</button>}
      <p className="auth-note">Sign-in details Firebase moolama secure-aa verify aagum.</p>
    </section>
  </main>;
}
