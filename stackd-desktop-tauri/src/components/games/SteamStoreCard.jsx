import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Tag } from 'lucide-react';
import axios from '../../api/axios';
import { ENDPOINTS } from '../../utils/constants';
import SteamIcon from '../../assets/steam-icon.svg?react';

const STEAM_URL_REGEX = /store\.steampowered\.com\/app\/(\d+)/i;

const TIMEZONE_TO_CC = {
    'America/Bogota': 'CO',
    'America/Mexico_City': 'MX',
    'America/Argentina/Buenos_Aires': 'AR',
    'America/Santiago': 'CL',
    'America/Lima': 'PE',
    'Europe/Madrid': 'ES',
    'America/New_York': 'US',
    'America/Los_Angeles': 'US',
    'Europe/London': 'GB',
};

const detectStoreCountry = () => {
    try {
        const locale = Intl.DateTimeFormat().resolvedOptions().locale || navigator.language || '';
        const regionMatch = /[-_]([A-Za-z]{2})$/.exec(locale);
        if (regionMatch) return regionMatch[1].toUpperCase();

        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz && TIMEZONE_TO_CC[tz]) return TIMEZONE_TO_CC[tz];
    } catch {
        // Fallback a US en backend
    }
    return null;
};

const extractSteamAppId = (websites = []) => {
    if (!Array.isArray(websites)) return null;
    for (const w of websites) {
        const match = STEAM_URL_REGEX.exec(String(w?.url || ''));
        if (match) {
            const id = Number(match[1]);
            if (id > 0) return id;
        }
    }
    return null;
};

const SteamStoreCard = ({ game, userGame }) => {
    const [priceInfo, setPriceInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    const countryCode = useMemo(() => detectStoreCountry(), []);

    const detectedAppId = useMemo(() => {
        if (userGame?.steam_appid) return Number(userGame.steam_appid);
        return extractSteamAppId(game?.websites);
    }, [userGame?.steam_appid, game?.websites]);

    useEffect(() => {
        let isMounted = true;
        if (!game?.id) return;

        const loadPrice = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (detectedAppId) params.set('appid', String(detectedAppId));
                if (countryCode) params.set('cc', countryCode);

                const qs = params.toString();
                const url = qs
                    ? `${ENDPOINTS.STEAM.GAME_PRICE(game.id)}?${qs}`
                    : ENDPOINTS.STEAM.GAME_PRICE(game.id);

                const res = await axios.get(url);
                if (isMounted) setPriceInfo(res.data);
            } catch {
                if (isMounted) setPriceInfo({ available: false });
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadPrice();
        return () => {
            isMounted = false;
        };
    }, [game?.id, detectedAppId, countryCode]);

    if (loading || !priceInfo?.available) {
        return null;
    }

    const hasDiscount = Number(priceInfo.discount_percent) > 0;
    const hasPrice = Boolean(priceInfo.final_formatted);
    const alreadyOwnedOnSteam = userGame?.source === 'steam';

    return (
        <div className="bg-primary-navy-dark rounded-2xl overflow-hidden border border-white/5">
            <div className="px-4 pt-4 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <SteamIcon className="w-4 h-4 fill-[#00adee]" />
                        <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">
                            Steam Store
                        </p>
                    </div>
                    {hasDiscount && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-extrabold">
                            <Tag size={11} />
                            -{priceInfo.discount_percent}%
                        </span>
                    )}
                </div>

                {/* Price display */}
                <div className="flex items-baseline justify-between bg-primary-navy rounded-xl px-3.5 py-2.5">
                    {priceInfo.is_free ? (
                        <span className="text-sm font-bold text-emerald-400">Free to Play</span>
                    ) : hasPrice ? (
                        <div className="flex items-baseline gap-2">
                            {hasDiscount && priceInfo.initial_formatted && (
                                <span className="text-xs text-gray-500 line-through">
                                    {priceInfo.initial_formatted}
                                </span>
                            )}
                            <span
                                className={`text-lg font-black leading-none ${hasDiscount ? 'text-emerald-400' : 'text-white'
                                    }`}
                            >
                                {priceInfo.final_formatted}
                            </span>
                        </div>
                    ) : priceInfo.coming_soon ? (
                        <span className="text-xs font-semibold text-gray-300">Coming Soon on Steam</span>
                    ) : (
                        <span className="text-xs font-semibold text-gray-400">Available on Steam</span>
                    )}

                    {priceInfo.currency && hasPrice && !priceInfo.is_free && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            {priceInfo.currency}
                        </span>
                    )}
                </div>

                {/* Action Button */}
                <a
                    href={priceInfo.store_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#171a21] hover:bg-[#1f242e] border border-[#00adee]/30 hover:border-[#00adee]/60 text-white text-xs font-bold transition-all shadow-sm"
                >
                    <SteamIcon className="w-4 h-4 fill-[#00adee]" />
                    <span>
                        {alreadyOwnedOnSteam || priceInfo.coming_soon || priceInfo.is_free || !hasPrice
                            ? 'View on Steam'
                            : 'Buy on Steam'}
                    </span>
                    <ExternalLink size={13} className="text-gray-400" />
                </a>
            </div>
        </div>
    );
};

export default SteamStoreCard;