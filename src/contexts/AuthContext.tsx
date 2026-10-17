import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { parseGetMyPrivateProfileV1Result } from '../../packages/shared-api/src/private-profile-v1';

interface Profile {
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
  cover_url?: string | null;
  bio: string | null;
  phone: string | null;
  // Canonical balance source: point_accounts.available_balance
  available_balance: number;
  city: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, nickname?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthState = Pick<AuthContextType, 'user' | 'session' | 'profile' | 'loading'>;
const initialState: AuthState = { user: null, session: null, profile: null, loading: true };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(initialState);
  const runtime = useRef<Pick<AuthContextType, 'refreshProfile' | 'signOut'> | null>(null);

  useEffect(() => {
    // Each effect lifetime owns its work, including Strict Mode cleanup/remount.
    let active = true;
    let epoch = 0;
    let request = 0;
    let authRevision = 0;
    let snapshot = initialState;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let fetching = false;
    let signingOut = false;

    const publish = (next: AuthState) => {
      if (!active) return;
      snapshot = next;
      // One update prevents externally visible mixed user/session/profile states.
      setState(next);
    };
    const cancelScheduled = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    };
    const invalidate = () => {
      epoch += 1;
      request += 1;
      fetching = false;
      cancelScheduled();
    };

    const fetchProfile = async (userId: string, isCurrent: () => boolean): Promise<Profile | null> => {
      const { data, error: profileError } = await supabase.rpc('get_my_private_profile_v1');
      if (!isCurrent()) return null;
      if (profileError) throw new Error('Owner profile unavailable');
      const { profile: profileData } = parseGetMyPrivateProfileV1Result(data);
      if (!profileData || profileData.userId !== userId) {
        throw new Error('Owner profile unavailable');
      }

      const { data: pointAccount, error: pointError } = await supabase
        .from('point_accounts')
        .select('available_balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (!isCurrent()) return null;
      if (pointError) {
        console.warn('Error fetching point account balance');
      }

      return {
        user_id: profileData.userId,
        nickname: profileData.nickname,
        avatar_url: profileData.avatarUrl,
        cover_url: profileData.coverUrl,
        bio: profileData.bio,
        phone: profileData.phone,
        city: profileData.city,
        available_balance: Number(pointAccount?.available_balance ?? 0),
      };
    };

    const refreshProfile = async () => {
      if (!active || signingOut || !snapshot.user) return;
      cancelScheduled();
      const userId = snapshot.user.id;
      const ownedEpoch = epoch;
      const ownedRequest = ++request;
      fetching = true;
      const isCurrent = () => active && !signingOut && epoch === ownedEpoch
        && request === ownedRequest && snapshot.user?.id === userId;
      try {
        const profile = await fetchProfile(userId, isCurrent);
        if (isCurrent()) publish({ ...snapshot, profile });
      } catch {
        if (isCurrent()) {
          console.error('Error fetching profile');
          publish({ ...snapshot, profile: null });
        }
      } finally {
        if (isCurrent()) fetching = false;
      }
    };

    const scheduleProfile = () => {
      if (!active || signingOut || fetching || timer !== null || !snapshot.user) return;
      const ownedEpoch = epoch;
      const ownedRequest = request;
      timer = setTimeout(() => {
        if (!active || epoch !== ownedEpoch || request !== ownedRequest) return;
        timer = null;
        void refreshProfile();
      }, 0);
    };
    const acceptSession = (session: Session | null, forceRefresh = false) => {
      const viewerChanged = snapshot.user?.id !== session?.user?.id;
      const sessionChanged = viewerChanged || snapshot.session?.access_token !== session?.access_token;
      const hadPendingRead = fetching || timer !== null;
      if (sessionChanged || !session || forceRefresh) invalidate();
      signingOut = false;
      publish({
        session,
        user: session?.user ?? null,
        profile: viewerChanged || !session ? null : snapshot.profile,
        loading: false,
      });
      if (session && (viewerChanged || !snapshot.profile || forceRefresh || (sessionChanged && hadPendingRead))) {
        scheduleProfile();
      }
    };

    const signOut = async () => {
      if (!active) throw new Error('Auth provider unavailable');
      invalidate();
      signingOut = true;
      const ownedRevision = ++authRevision;
      const isCurrent = () => active && authRevision === ownedRevision;
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        // SDK events are authoritative; a late completion cannot clear a new login.
        if (isCurrent()) acceptSession(null);
      } catch (error) {
        if (isCurrent()) {
          signingOut = false;
          if (snapshot.loading) publish({ ...snapshot, loading: false });
          if (!snapshot.profile) scheduleProfile();
        }
        throw error;
      }
    };
    runtime.current = { refreshProfile, signOut };
    publish(initialState);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active || (event === 'INITIAL_SESSION' && authRevision > 0)) return;
        authRevision += 1;
        acceptSession(event === 'SIGNED_OUT' ? null : session, event === 'USER_UPDATED');
      }
    );

    // Initialization is only a fallback until the first authoritative Auth event.
    void supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!active || authRevision > 0) return;
      if (error) throw error;
      acceptSession(session);
    }).catch(() => {
      if (active && authRevision === 0) {
        console.warn('Error initializing auth session');
        publish({ ...initialState, loading: false });
      }
    });

    return () => {
      active = false;
      invalidate();
      runtime.current = null;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => { await runtime.current?.refreshProfile(); };

  const signUp = async (email: string, password: string, nickname?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            nickname: nickname || '新用户'
          }
        }
      });
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    if (!runtime.current) throw new Error('Auth provider unavailable');
    await runtime.current.signOut();
  };

  const value = {
    ...state,
    signUp,
    signIn,
    signOut,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
