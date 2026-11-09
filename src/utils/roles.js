/**
 * Which routes each platform role may open. Kept here so AppShell (the nav), App (the route
 * guard) and LoginPage (where to land) all agree. The server enforces the same split in
 * SecurityConfig: a PLATFORM_SALES token is only accepted on /platform/pipeline/**,
 * /platform/leads/** and /platform/auth/**.
 */
export const SALES_ROUTES = ['/pipeline', '/leads'];

export function canOpen(role, path) {
  if (role === 'PLATFORM_SALES') return SALES_ROUTES.some((r) => path === r || path.startsWith(r + '/'));
  if (path === '/team') return role === 'PLATFORM_ADMIN';
  return true;
}

/** Where a freshly signed-in operator lands. */
export function homeFor(role) {
  return role === 'PLATFORM_SALES' ? '/pipeline' : '/accounts';
}

export const ROLE_LABELS = {
  PLATFORM_ADMIN: { label: 'Admin', hint: 'PLATFORM_ADMIN - full oversight: clinic status, plans, features, the team, and the sales surface' },
  PLATFORM_SUPPORT: { label: 'Support', hint: 'PLATFORM_SUPPORT - read-only everywhere' },
  PLATFORM_SALES: { label: 'Sales', hint: 'PLATFORM_SALES - the Pipeline and Leads tabs only; can add, edit and move leads' },
};
