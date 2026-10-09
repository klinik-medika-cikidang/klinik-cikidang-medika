import { describe, expect, it } from 'vitest';
import { ROLE_PERMISSIONS, roleCanAccessRoute, roleDefaultRoute } from '@/lib/auth/permissions';

const ALL_ROUTES = ['/', '/pendaftaran', '/rekam-medis', '/program-khusus', '/buku-kas', '/laporan', '/paket-terapi'];
const OPERATIONAL_ROUTES = ['/pendaftaran', '/rekam-medis', '/program-khusus', '/buku-kas', '/laporan'];
const OWNER_ONLY_ROUTES = ['/', '/paket-terapi'];

describe('F-011 permission matrix', () => {
  it('lets owner reach every registered route', () => {
    ALL_ROUTES.forEach((route) => {
      expect(roleCanAccessRoute('owner', route)).toBe(true);
    });
  });

  it('blocks the dashboard for dokter_admin but keeps the operational routes', () => {
    expect(roleCanAccessRoute('dokter_admin', '/')).toBe(false);
    OPERATIONAL_ROUTES.forEach((route) => {
      expect(roleCanAccessRoute('dokter_admin', route)).toBe(true);
    });
  });

  it('allows nested paths under an allowed route only', () => {
    expect(roleCanAccessRoute('dokter_admin', '/rekam-medis/123')).toBe(true);
    expect(roleCanAccessRoute('dokter_admin', '/buku-kas/baru')).toBe(true);
    // A matching prefix without a path boundary must not grant access.
    expect(roleCanAccessRoute('dokter_admin', '/rekam-medis-x')).toBe(false);
  });

  it('always allows login and rejects an empty role', () => {
    expect(roleCanAccessRoute(null, '/login')).toBe(true);
    expect(roleCanAccessRoute(null, '/rekam-medis')).toBe(false);
  });

  it('sends each role to its own default route', () => {
    expect(roleDefaultRoute('owner')).toBe('/');
    expect(roleDefaultRoute('dokter_admin')).toBe('/rekam-medis');
    expect(roleDefaultRoute(null)).toBe('/login');
  });

  it('keeps the dashboard out of the dokter_admin matrix', () => {
    expect(ROLE_PERMISSIONS.owner).toContain('/');
    expect(ROLE_PERMISSIONS.dokter_admin).not.toContain('/');
  });

  it('keeps F-012 paket terapi owner-only for now', () => {
    OWNER_ONLY_ROUTES.forEach((route) => {
      expect(roleCanAccessRoute('owner', route)).toBe(true);
      expect(roleCanAccessRoute('dokter_admin', route)).toBe(false);
    });
  });
});
