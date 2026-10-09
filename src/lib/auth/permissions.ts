import type { UserRole } from '@/types/database';

// F-011 BR-001: Dokter/Admin runs the daily flow from registration to payment and
// expense recording. The dashboard and cost monitoring stay owner-only.
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  owner: ['/', '/pendaftaran', '/rekam-medis', '/program-khusus', '/buku-kas', '/laporan'],
  dokter_admin: ['/pendaftaran', '/rekam-medis', '/program-khusus', '/buku-kas', '/laporan'],
};

export const ROLE_DEFAULT_ROUTES: Record<UserRole, string> = {
  owner: '/',
  dokter_admin: '/rekam-medis',
};

export function roleCanAccessRoute(role: UserRole | null, pathname: string): boolean {
  if (pathname === '/login') return true;
  if (!role) return false;

  const allowedRoutes = ROLE_PERMISSIONS[role] || [];
  const cleanPath = pathname === '' ? '/' : pathname;
  return allowedRoutes.some((route) => {
    if (route === '/') return cleanPath === '/';
    return cleanPath === route || cleanPath.startsWith(`${route}/`);
  });
}

export function roleDefaultRoute(role: UserRole | null): string {
  if (!role) return '/login';
  return ROLE_DEFAULT_ROUTES[role] || '/login';
}
