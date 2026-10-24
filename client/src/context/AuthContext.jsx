import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const authenticated = !isSupabaseConfigured || Boolean(session);
  const unauthenticated =
    isSupabaseConfigured && !authLoading && !authenticated;

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }
    let previousSession = null;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        previousSession = data?.session || null;
        setSession(data?.session || null);
        setAuthLoading(false);
      })
      .catch(() => {
        setAuthLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        const wasAuthenticated = Boolean(previousSession);
        const isAuthenticated = Boolean(nextSession);
        previousSession = nextSession;
        setSession(nextSession);
        setAuthLoading(false);
        if (wasAuthenticated && !isAuthenticated) {
          queryClient.cancelQueries();
          queryClient.removeQueries();
        } else if (!wasAuthenticated && isAuthenticated) {
          queryClient.invalidateQueries();
          queryClient.refetchQueries({ type: 'active' });
        }
      },
    );
    return () => listener?.subscription?.unsubscribe();
  }, [queryClient]);

  const signOut = useCallback(async () => {
    try {
      await supabase?.auth.signOut();
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
    setSession(null);
    await queryClient.cancelQueries();
    queryClient.removeQueries();
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        session,
        authLoading,
        authenticated,
        unauthenticated,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
