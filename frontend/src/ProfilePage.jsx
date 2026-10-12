import { useState } from 'react';
import { ArrowLeft, BadgeCheck, CalendarDays, Check, LogOut, Mail, Save, ShieldCheck, UserRound } from 'lucide-react';

function providerLabel(user) {
  const ids = user?.providerData?.map(provider => provider.providerId) || [];
  if (ids.includes('google.com')) return 'Google';
  if (ids.includes('password')) return 'Email and password';
  return user ? 'Firebase account' : 'Guest session';
}

export default function ProfilePage({ user, onBack, onSignOut, onSaveName }) {
  const [name, setName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const created = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Not available';
  const initials = (name || user?.email || 'S').trim().slice(0, 1).toUpperCase();

  async function saveName(event) {
    event.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    setNotice('');
    setError('');
    try {
      await onSaveName(name.trim());
      setNotice('Profile name updated.');
    } catch {
      setError('Profile save panna mudiyala. Please retry pannunga.');
    } finally {
      setSaving(false);
    }
  }

  return <section className="tool-panel profile-panel">
    <div className="tool-heading">
      <span className="tool-icon"><UserRound size={20}/></span>
      <p className="eyebrow">YOUR ACCOUNT</p>
      <h1>Your <span>profile.</span></h1>
      <p>Account details-um sign-in method-um inga manage pannalaam.</p>
    </div>
    <section className="profile-card" aria-label="Profile details">
      <button type="button" className="profile-back" onClick={onBack}><ArrowLeft size={15}/> Back to learning</button>
      <div className="profile-identity">
        {user?.photoURL ? <img className="profile-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer"/> : <div className="profile-avatar profile-avatar-fallback" aria-hidden="true">{initials}</div>}
        <div><p className="eyebrow">STUDY MASTER ACCOUNT</p><h2>{name || 'Add your name'}</h2><p>{user?.email || 'Guest mode — no account signed in'}</p></div>
      </div>
      {user ? <form className="profile-form" onSubmit={saveName}>
        <label htmlFor="profile-name">Display name</label>
        <div className="profile-name-row"><input id="profile-name" value={name} maxLength={80} onChange={event => setName(event.target.value)} placeholder="Enter your name"/><button className="primary-button" type="submit" disabled={saving || name.trim() === (user.displayName || '')}><Save size={15}/>{saving ? 'Saving…' : 'Save name'}</button></div>
        {notice && <p className="profile-notice" role="status"><Check size={14}/>{notice}</p>}
        {error && <p className="profile-error" role="alert">{error}</p>}
      </form> : <p className="profile-guest-note">Sign in with Google or email to create a profile tied to your account.</p>}
      <div className="profile-details">
        <div className="profile-detail"><span><Mail size={16}/></span><div><small>Email</small><strong>{user?.email || 'Not signed in'}</strong></div></div>
        <div className="profile-detail"><span><ShieldCheck size={16}/></span><div><small>Sign-in method</small><strong>{providerLabel(user)}</strong></div></div>
        <div className="profile-detail"><span><CalendarDays size={16}/></span><div><small>Account created</small><strong>{created}</strong></div></div>
        <div className="profile-detail"><span><BadgeCheck size={16}/></span><div><small>Email verification</small><strong>{user ? user.emailVerified ? 'Verified' : 'Not verified' : 'Guest session'}</strong></div></div>
      </div>
      {user && <button type="button" className="profile-signout" onClick={onSignOut}><LogOut size={15}/> Sign out</button>}
    </section>
  </section>;
}
