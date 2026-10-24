import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function AuthPanel() {
  const { session, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('sign-in');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured) {
    return <span className="demo-badge">Demo mode</span>;
  }

  if (session) {
    return (
      <button className="button button-ghost" onClick={signOut}>
        Sign out
      </button>
    );
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const result =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
    } else {
      setMessage(
        mode === 'sign-in' ? '' : 'Check your email to confirm your account.',
      );
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} aria-label="Authentication">
      <input
        aria-label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
      />
      <input
        aria-label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        minLength={6}
        required
      />
      <button className="button" disabled={busy}>
        {busy ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
      </button>
      <button
        type="button"
        className="link-button"
        onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
      >
        {mode === 'sign-in'
          ? 'Create an account'
          : 'Already have an account? Sign in'}
      </button>
      {message && (
        <small className="form-error" role="alert">
          {message}
        </small>
      )}
    </form>
  );
}

