export const getStoredTenantId = () => {
  const userStr = localStorage.getItem('zaproute_user');
  const user = userStr ? JSON.parse(userStr) : null;
  return user?.tenantId as string | undefined;
};
