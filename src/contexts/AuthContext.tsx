import React, { createContext, useContext, useEffect, useState } from 'react';
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error: profileError } = await supabase.rpc('get_my_private_profile_v1');

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

      if (pointError) {
        console.warn('Error fetching point account balance:', pointError);
      }

      setProfile({
        user_id: profileData.userId,
        nickname: profileData.nickname,
        avatar_url: profileData.avatarUrl,
        cover_url: profileData.coverUrl,
        bio: profileData.bio,
        phone: profileData.phone,
        city: profileData.city,
        available_balance: Number(pointAccount?.available_balance ?? 0),
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // 设置认证状态监听器
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // 使用 setTimeout 避免死锁
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // 获取初始会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
