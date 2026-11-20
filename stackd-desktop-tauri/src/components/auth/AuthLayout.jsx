import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import { ENDPOINTS } from '../../utils/constants';
import { formatIGDBImage } from '../../utils/formatters';
import brandLogo from '../../assets/isotipo.svg';
import brandWordmark from '../../assets/logotipo.svg';

/**
 * AuthLayout — Shared fullscreen layout for Login & Register.
 *
 * Renders a full-bleed screenshot of the most anticipated game as background
 * with a dark left-to-right gradient overlay. The form content is placed on
 * the left side (~45% width) over the darkest part of the gradient.
 */
const AuthLayout = ({ children }) => {
  const [featuredGame, setFeaturedGame] = useState(null);
  const [bgLoaded, setBgLoaded] = useState(false);

  // Fetch the most anticipated game for the background
  useEffect(() => {
    let cancelled = false;

    const fetchFeatured = async () => {
      try {
        const res = await axios.get(`${ENDPOINTS.GAMES.ANTICIPATED}?limit=5`);
        const games = res.data?.games || [];

        // Pick the nearest-to-release game that has screenshots
        const best = [...games]
          .filter((g) => g.screenshots?.length || g.artworks?.length)
          .sort((a, b) => (a.first_release_date || 0) - (b.first_release_date || 0))[0] || games[0];

        if (!cancelled && best) setFeaturedGame(best);
      } catch {
        // Silently fail — we just won't show a background
      }
    };

    fetchFeatured();
    return () => { cancelled = true; };
  }, []);

  // Build background image URL
  const bgUrl = useMemo(() => {
    if (!featuredGame) return null;

    if (featuredGame.screenshots?.length) {
      return formatIGDBImage(featuredGame.screenshots[0].url, 't_screenshot_huge');
    }
    if (featuredGame.artworks?.length) {
      return formatIGDBImage(featuredGame.artworks[0].url, 't_1080p');
    }
    if (featuredGame.cover?.url) {
      return formatIGDBImage(featuredGame.cover.url, 't_1080p');
    }
    return null;
  }, [featuredGame]);

  return (
    <div className="min-h-screen bg-primary-navy relative overflow-hidden flex">

      {/* ── Background Image (no blur, per design) ── */}
      {bgUrl && (
        <>
          <img
            src={bgUrl}
            alt=""
            onLoad={() => setBgLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${bgLoaded ? 'opacity-50' : 'opacity-0'}`}
            style={{ filter: 'brightness(0.65)' }}
          />
          {/* Lateral gradient: dark left → transparent right */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to right, rgba(8,9,13,0.97) 0%, rgba(8,9,13,0.92) 35%, rgba(8,9,13,0.55) 60%, rgba(8,9,13,0.15) 85%, transparent 100%)',
            }}
          />
        </>
      )}

      {/* ── Featured Game Badge (top-right) ── */}
      {featuredGame && (
        <Link
          to={`/game/${featuredGame.slug}`}
          className="absolute top-6 right-8 z-20 text-primary-yellow/70 hover:text-primary-yellow transition-colors text-[11px] font-bold uppercase tracking-[0.2em]"
        >
          Featured: {featuredGame.name}
        </Link>
      )}

      {/* ── Left Content Area ── */}
      <div className="relative z-10 w-full max-w-[520px] min-h-screen flex flex-col justify-center px-10 md:px-16 lg:px-20 py-12">

        {/* Logo */}
        <div className="mb-12">
          <Link to="/" className="inline-block group">
            <div className="flex items-center gap-3">
              {/* Isotipo */}
              <img
                src={brandLogo}
                alt="Stackd Isotipo"
                className="h-10 md:h-12 w-auto object-contain transition-transform group-hover:scale-105"
              />
              {/* Logotipo (Texto) */}
              <img
                src={brandWordmark}
                alt="Stackd"
                className="h-6 md:h-8 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </div>
          </Link>
        </div>

        {/* Form Content (injected) */}
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;

