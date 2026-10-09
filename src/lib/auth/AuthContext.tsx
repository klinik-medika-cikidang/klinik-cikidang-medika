'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { UserRole, UserProfile } from '@/types/database';
import { roleCanAccessRoute, roleDefaultRoute } from '@/lib/auth/permissions';

export { ROLE_PERMISSIONS, ROLE_DEFAULT_ROUTES } from '@/lib/auth/permissions';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  signOut: () => Promise<void>;
  canAccessRoute: (pathname: string) => boolean;
  getDefaultRoute: (role: UserRole | null) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const ROLE_LABELS: Record<UserRole, { label: string; badge: string; color: string }> = {
  owner: {
    label: 'dr. Ovan & dr. Neneng (Pimpinan)',
    badge: 'Owner (Pimpinan)',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  dokter_admin: {
    label: 'Dokter / Admin Klinik',
    badge: 'Dokter Admin',
    color: 'bg-teal-50 text-teal-700 border-teal-200',
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const parseUserProfile = useCallback((authUser: User | null): UserProfile | null => {
    if (!authUser) return null;
    const rawRole = (authUser.user_metadata?.role as string)?.toLowerCase();
    const role: UserRole =
      rawRole === 'owner'
        ? 'owner'
        : rawRole === 'dokter_admin' || rawRole === 'dokter' || rawRole === 'kasir'
          ? 'dokter_admin'
          : 'dokter_admin';

    const name = authUser.user_metadata?.name || ROLE_LABELS[role].label;

    return {
      id: authUser.id,
      email: authUser.email || '',
      role,
      name,
      clinic: authUser.user_metadata?.clinic || 'Klinik Pratama Cikidang Medika',
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error fetching session:', error.message);
        }
        if (isMounted) {
          if (session?.user) {
            setUser(session.user);
            setProfile(parseUserProfile(session.user));
          } else {
            setUser(null);
            setProfile(null);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (isMounted) setIsLoading(false);
      }
    }

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event: string, session: Session | null) => {
        if (!isMounted) return;
        if (session?.user) {
          setUser(session.user);
          setProfile(parseUserProfile(session.user));
        } else {
          setUser(null);
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, parseUserProfile]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          const userProf = parseUserProfile(data.user);
          setUser(data.user);
          setProfile(userProf);
          return { success: true, role: userProf?.role };
        }

        return { success: false, error: 'Pengguna tidak ditemukan.' };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Terjadi kesalahan saat masuk.' };
      }
    },
    [supabase, parseUserProfile]
  );

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }, [supabase]);

  const canAccessRoute = useCallback(
    (pathname: string): boolean => roleCanAccessRoute(profile?.role ?? null, pathname),
    [profile]
  );

  const getDefaultRoute = useCallback(
    (userRole: UserRole | null): string => roleDefaultRoute(userRole),
    []
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      role: profile?.role || null,
      isLoading,
      signIn,
      signOut,
      canAccessRoute,
      getDefaultRoute,
    }),
    [user, profile, isLoading, signIn, signOut, canAccessRoute, getDefaultRoute]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
