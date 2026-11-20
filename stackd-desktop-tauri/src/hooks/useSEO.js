import { useEffect } from 'react';

const DEFAULT_DESCRIPTION = 'Track your game collection, rate titles, share reviews, and discover new games on Stackd.';

/**
 * Dynamically manages document title, meta description, Open Graph, and Twitter Card tags.
 * @param {{ title?: string, description?: string, image?: string }} options
 */
const useSEO = ({ title, description, image } = {}) => {
    useEffect(() => {
        const fullTitle = title ? `${title} | Stackd` : 'Stackd';
        document.title = fullTitle;

        const desc = description || DEFAULT_DESCRIPTION;
        const url = window.location.href;

        const setMeta = (attr, key, content) => {
            if (!content) return;
            let el = document.querySelector(`meta[${attr}="${key}"]`);
            if (!el) {
                el = document.createElement('meta');
                el.setAttribute(attr, key);
                document.head.appendChild(el);
            }
            el.setAttribute('content', content);
        };

        setMeta('name', 'description', desc);
        setMeta('property', 'og:title', fullTitle);
        setMeta('property', 'og:description', desc);
        setMeta('property', 'og:url', url);
        setMeta('name', 'twitter:title', fullTitle);
        setMeta('name', 'twitter:description', desc);

        if (image) {
            setMeta('property', 'og:image', image);
            setMeta('name', 'twitter:image', image);
        }

        // Update canonical
        let canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) canonical.setAttribute('href', url);
    }, [title, description, image]);
};

export default useSEO;
