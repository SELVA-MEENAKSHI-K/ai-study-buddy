import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { BookOpen, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from 'lucide-react';

function friendlyError(error) {
  const messages = {
    'auth/email-already-in-use': 'Indha email-ku account already irukku. Sign in pannunga.',
    'auth/invalid-credential': 'Email/password sariyaa nu check pannunga.',
    'auth/invalid-email': 'Valid email address enter pannunga.',
    'auth/weak-password': 'Password at least 6 characters irukkanum.',
    'auth/too-many-requests': 'Neraya attempts aagiduchu. Konjam neram kazhichu try pannunga.',
    'auth/network-request-failed': 'Network connection check pannitu retry pannunga.',
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

      {configured && <form className="auth-form" onSubmit={submit}>
        <label htmlFor="auth-email">Email address</label>
        <div className="auth-input"><Mail size={17}/><input id="auth-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com"/></div>
        <label htmlFor="auth-password">Password</label>
        <div className="auth-input"><LockKeyhole size={17}/><input id="auth-password" type={showPassword ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={6} required value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 6 characters"/><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="auth-submit" disabled={busy}>{busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}</button>
        <p className="auth-switch">{isSignup ? 'Already account irukka?' : 'Account illaya?'} <button type="button" onClick={() => { setIsSignup(value => !value); setError(''); }}> {isSignup ? 'Sign in' : 'Create account'}</button></p>
      </form>}
      {!configured && <button className="auth-submit guest-submit" onClick={onGuest}>Continue as guest</button>}
      <p className="auth-note">Sign-in details Firebase moolama secure-aa verify aagum.</p>
    </section>
  </main>;
}
