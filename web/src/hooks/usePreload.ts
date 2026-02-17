import { useEffect } from 'react';

/**
 * Hook para fazer preload de componentes lazy-loaded
 * Útil para carregar rotas frequentemente acessadas em background
 *
 * @param importFn - Função de import dinâmico do componente
 * @param delay - Delay em ms antes de iniciar o preload (padrão: 2000ms)
 *
 * @example
 * // No Dashboard, preload de rotas frequentes
 * usePreload(() => import('./pages/RouteList'));
 * usePreload(() => import('./pages/RoutePlanner'));
 */
export const usePreload = (
  importFn: () => Promise<any>,
  delay: number = 2000,
) => {
  useEffect(() => {
    // Preload após delay (quando usuário está idle)
    const timer = setTimeout(() => {
      importFn().catch(() => {
        // Silenciosamente falhar se o preload não funcionar
        // O componente será carregado normalmente quando necessário
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [importFn, delay]);
};
