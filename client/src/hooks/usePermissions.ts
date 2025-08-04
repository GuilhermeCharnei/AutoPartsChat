import { useAuth } from './useAuth';

export function usePermissions() {
  const { user } = useAuth();
  
  const permissions = (user as any)?.permissions || {};
  const role = (user as any)?.role;

  const hasPermission = (permission: string): boolean => {
    // DEV has access to everything
    if (role === 'dev') return true;
    
    return permissions[permission] === true;
  };

  const canAccess = {
    // Basic permissions
    viewStock: hasPermission('viewStock'),
    editProducts: hasPermission('editProducts'),
    viewReports: hasPermission('viewReports'),
    manageUsers: hasPermission('manageUsers'),
    adminAccess: hasPermission('adminAccess'),
    apiConfig: hasPermission('apiConfig'),
    editOwnProfile: hasPermission('editOwnProfile'),
    
    // Role-specific checks
    canCreateAdmin: role === 'dev' || role === 'administrador',
    canEditUsers: role === 'dev' || role === 'administrador' || role === 'gerente',
    canViewDashboard: role !== 'vendedor',
    canManageInventory: role !== 'vendedor',
    
    // UI visibility
    showAdminPanel: role !== 'vendedor',
    showInventoryTab: role !== 'vendedor',
    showUsersTab: role !== 'vendedor',
    showReportsTab: role !== 'vendedor',
    showApiConfigTab: role === 'dev',
  };

  return {
    user,
    role,
    permissions,
    hasPermission,
    canAccess
  };
}