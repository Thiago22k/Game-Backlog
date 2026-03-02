import useSEO from './useSEO';

/**
 * Backward-compatible wrapper.
 * Sets only the page title; use `useSEO` directly for richer metadata.
 */
const usePageTitle = (title) => useSEO({ title });

export default usePageTitle;
