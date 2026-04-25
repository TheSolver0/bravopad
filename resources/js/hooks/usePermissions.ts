import { usePage } from '@inertiajs/react';
import type { Permission } from '@/pages/types';

interface AuthPermissions {
  canManageChallenges: boolean;
  canManageUsers: boolean;
}

interface PageProps {
  auth: {
    user?: { permission?: Permission };
    permissions: AuthPermissions;
  };
}

export function usePermissions() {
  const { auth } = usePage<PageProps>().props;
  const perm: Permission = auth?.user?.permission ?? 'employee';

  return {
    permission: perm,
    isAdmin:   perm === 'admin',
    isManager: perm === 'admin' || perm === 'manager',
    canManageChallenges: auth?.permissions?.canManageChallenges ?? false,
    canManageUsers:      auth?.permissions?.canManageUsers ?? false,
  };
}
