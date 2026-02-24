import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { Trophy, Star, LayoutDashboard, Gamepad2, Library, Lock, Camera, Trash2, Pencil, X, Settings as SettingsIcon, Image as ImageIcon, User as UserIcon, Link as LinkIcon, LayoutList, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGames } from '../../hooks/useGames';
import { useCollections } from '../../hooks/useCollections';
import TwitchIcon from '../../assets/twitch-icon.svg?react';
import DiscordIcon from '../../assets/discord-icon.svg?react';
import SteamIcon from '../../assets/steam-icon.svg?react';
import Navbar from '../../components/layout/Navbar';
import NotFound from '../NotFound';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import defaultAvatar from '../../assets/default_avatar.png';
import usePageTitle from '../../hooks/usePageTitle';

const ProfileLayout = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const { username } = useParams();
    const location = useLocation();
    const gamesHook = useGames();
    const { games, getUserGames } = gamesHook;
    const { collections, getUserCollections } = useCollections();

    const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);

    const isOwner = user?.username === username;
    const displayUsername = isOwner ? user?.username : username;

    // Bio and social links — from context for owner, from hook for visitors
    const profileBio = isOwner ? user?.bio : gamesHook.profileBio;
    const profileSocialTwitch = isOwner ? user?.social_twitch : gamesHook.profileSocialTwitch;
    const profileSocialDiscord = isOwner ? user?.social_discord : gamesHook.profileSocialDiscord;
    const profileSocialSteam = isOwner ? user?.social_steam : gamesHook.profileSocialSteam;

    usePageTitle(`${displayUsername}'s Profile`);

    useEffect(() => {
        if (username) {
            getUserGames(username);
            getUserCollections(username, false); // Fetch collections silently
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username]);

    // Lógica para subida de avatar y banner
    const hiddenFileInputRef = useRef(null);
    const hiddenBannerInputRef = useRef(null);

    const handleAvatarClick = () => {
        if (isOwner && hiddenFileInputRef.current) {
            hiddenFileInputRef.current.click();
        }
    };

    const handleBannerClick = () => {
        if (isOwner && hiddenBannerInputRef.current) {
            hiddenBannerInputRef.current.click();
        }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validar tamaño (5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size exceeds the limit (5MB)');
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const toastId = toast.loading('Uploading image...');
            const token = localStorage.getItem('token');
            const res = await axios.post('/users/avatar', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            toast.dismiss(toastId);
            toast.success('Avatar updated');
            // Actualizar contexto local para reflejar cambio inmediato
            updateUser({ avatar_url: res.data.user.avatar_url });
        } catch (error) {
            toast.dismiss();
            toast.error(error.response?.data?.error || 'Error uploading image');
        }
    };

    const handleDeleteAvatar = async () => {
        if (!window.confirm('Are you sure you want to remove your custom avatar?')) return;

        try {
            const toastId = toast.loading('Removing avatar...');
            const token = localStorage.getItem('token');
            await axios.delete('/users/avatar', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.dismiss(toastId);
            toast.success('Avatar removed');
            // Actualizar contexto local para volver a default_avatar o iniciales
            updateUser({ avatar_url: null });
        } catch (error) {
            toast.dismiss();
            toast.error(error.response?.data?.error || 'Error removing avatar');
        }
    };

    const handleBannerFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validar tamaño (10MB para banner)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File size exceeds the limit (10MB)');
            return;
        }

        const formData = new FormData();
        formData.append('banner', file);

        try {
            const toastId = toast.loading('Uploading banner...');
            const token = localStorage.getItem('token');
            const res = await axios.post('/users/banner', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            toast.dismiss(toastId);
            toast.success('Banner updated');
            // Actualizar contexto local
            updateUser({ banner_url: res.data.user.banner_url });
            // Forzar recarga o actualización de `user` state si es owner
            // El context lo hace automáticamente.
        } catch (error) {
            toast.dismiss();
            toast.error(error.response?.data?.error || 'Error uploading banner');
        }
    };

    const handleDeleteBanner = async () => {
        if (!window.confirm('Are you sure you want to remove your custom banner?')) return;

        try {
            const toastId = toast.loading('Removing banner...');
            const token = localStorage.getItem('token');
            await axios.delete('/users/banner', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            toast.dismiss(toastId);
            toast.success('Banner removed');
            // Actualizar contexto local
            updateUser({ banner_url: null });
        } catch (error) {
            toast.dismiss();
            toast.error(error.response?.data?.error || 'Error removing banner');
        }
    };

    const handleShareProfile = () => {
        const profileUrl = window.location.origin + `/profile/${username}`;
        navigator.clipboard.writeText(profileUrl);
        toast.success('Profile link copied to clipboard!');
    };

    // Calcular estadísticas globales
    const stats = useMemo(() => {
        const ratedGames = games.filter(g => g.rating);
        return {
            total: games.length,
            completed: games.filter(g => g.status === 'completed').length,
            avgRating: ratedGames.length > 0
                ? (ratedGames.reduce((sum, g) => sum + Number(g.rating), 0) / ratedGames.length).toFixed(1)
                : 0,
        };
    }, [games]);

    const tabs = [
        { name: 'Stats', path: `/profile/${username}`, icon: LayoutDashboard },
        { name: 'Games', path: `/profile/${username}/games`, icon: Gamepad2 },
        { name: 'Collections', path: `/profile/${username}/collections`, icon: Library },
        { name: 'Activity', path: `/profile/${username}/activity`, icon: LayoutList },
        { name: 'Likes', path: `/profile/${username}/likes`, icon: Heart },
    ];

    const currentPath = location.pathname;

    // Verificar si es una ruta válida de perfil
    const isValidRoute = tabs.some(tab =>
        location.pathname === tab.path || location.pathname.startsWith(tab.path + '/')
    );
    const displayBanner = isOwner ? user?.banner_url : gamesHook.profileBannerUrl;
    const bannerImage = displayBanner ? `http://localhost:3000${displayBanner}` : null;

    // Si el usuario no existe la API devuelve ese mensaje de error específico
    if (gamesHook.error === 'Usuario no encontrado') {
        return <NotFound />;
    }

    return (
        <div className="min-h-screen bg-primary-navy">
            <Navbar />

            {/* HEADER HERO ────────── */}
            <div className="relative w-full min-h-[380px] bg-primary-navy-dark border-b border-gray-700 flex flex-col justify-end pt-32 pb-8 px-4 sm:px-6 lg:px-8 focus:outline-none" tabIndex="-1">
                {/* FONDO BANNER (Absoluto) */}
                {bannerImage ? (
                    <>
                        <div
                            className="absolute inset-0 bg-cover bg-center pointer-events-none"
                            style={{ backgroundImage: `url(${bannerImage})` }}
                        />
                        {/* Gradiente oscuro superior (para que se lea la NavBar) e inferior (para que se lean los textos del perfil) */}
                        <div className="absolute inset-0 bg-gradient-to-b from-primary-navy/90 via-black/30 to-primary-navy/90" />
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[0px]" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary-navy-dark to-gray-800/20" />
                )}

                {/* CONTENIDO DEL HEADER (Relativo) */}
                <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="flex items-end gap-6 shrink-0">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-primary-navy shadow-2xl bg-primary-navy-dark flex items-center justify-center">
                                {isOwner ? (
                                    <img src={user?.avatar_url ? `http://localhost:3000${user.avatar_url}` : defaultAvatar} alt="Avatar" className="w-full h-full object-cover bg-primary-navy-dark" />
                                ) : (
                                    <img src={gamesHook.profileAvatarUrl ? `http://localhost:3000${gamesHook.profileAvatarUrl}` : defaultAvatar} alt="Avatar" className="w-full h-full object-cover bg-primary-navy-dark" />
                                )}
                            </div>
                            {/* Hidden inputs keep existing functionality */}
                            {isOwner && (
                                <>
                                    <input
                                        type="file"
                                        ref={hiddenFileInputRef}
                                        className="hidden"
                                        accept="image/png, image/jpeg, image/jpg, image/webp"
                                        onChange={handleFileChange}
                                    />
                                    <input
                                        type="file"
                                        ref={hiddenBannerInputRef}
                                        className="hidden"
                                        accept="image/png, image/jpeg, image/jpg, image/webp"
                                        onChange={handleBannerFileChange}
                                    />
                                </>
                            )}
                        </div>

                        {/* Texto */}
                        <div className="mb-2">
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-md">
                                    {isOwner ? `${user?.username}` : `${username}`}
                                </h2>
                                <button
                                    onClick={handleShareProfile}
                                    className="text-white/50 hover:text-white transition-colors mt-2"
                                    title="Copy profile link"
                                >
                                    <LinkIcon size={20} strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Stats */}
                            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm font-medium drop-shadow-sm">
                                <span className="text-white bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm border border-white/10">
                                    {stats.total} game{stats.total !== 1 ? 's' : ''}
                                </span>
                                <span className="text-white bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm border border-white/10 flex items-center gap-1.5">
                                    <Library size={14} className="opacity-70" />
                                    {collections.length} colls
                                </span>
                                <span className="text-green-300 bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm border border-white/10 flex items-center gap-1.5">
                                    <Trophy size={14} />
                                    {stats.completed} comp
                                </span>
                                {Number(stats.avgRating) > 0 && (
                                    <span className="text-primary-yellow bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm border border-white/10 flex items-center gap-1.5">
                                        <Star size={14} fill="currentColor" />
                                        {stats.avgRating} avg
                                    </span>
                                )}
                            </div>

                            {/* Bio */}
                            {profileBio && (
                                <p className="mt-2 text-sm text-gray-300/80 italic max-w-sm drop-shadow-sm line-clamp-2">{profileBio}</p>
                            )}

                            {/* Social Links */}
                            {(profileSocialTwitch || profileSocialDiscord || profileSocialSteam) && (
                                <div className="flex items-center gap-2 mt-2">
                                    {profileSocialTwitch && (
                                        <a
                                            href={`https://twitch.tv/${profileSocialTwitch}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title={`Twitch: ${profileSocialTwitch}`}
                                            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/20 hover:bg-black/40 backdrop-blur-sm border border-white/10 text-white text-xs font-medium transition-colors"
                                        >
                                            <TwitchIcon className="w-4 h-4" />
                                            {profileSocialTwitch}
                                        </a>
                                    )}
                                    {profileSocialDiscord && (
                                        <span
                                            title={`Discord: ${profileSocialDiscord}`}
                                            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/20 backdrop-blur-sm border border-white/10 text-white text-xs font-medium cursor-default select-all"
                                        >
                                            <DiscordIcon className="w-4 h-4" />
                                            {profileSocialDiscord}
                                        </span>
                                    )}
                                    {profileSocialSteam && (
                                        <a
                                            href={`https://steamcommunity.com/id/${profileSocialSteam}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title={`Steam: ${profileSocialSteam}`}
                                            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/20 hover:bg-black/40 backdrop-blur-sm border border-white/10 text-white text-xs font-medium transition-colors"
                                        >
                                            <SteamIcon className="w-4 h-4" />
                                            {profileSocialSteam}
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {isOwner && (
                        <div className="flex gap-3 mb-2 shrink-0">
                            <button
                                onClick={() => setIsCustomizationModalOpen(true)}
                                className="flex items-center gap-2 px-5 py-2 bg-black/40 hover:bg-black/60 text-white rounded-full font-bold transition-all shadow-lg backdrop-blur-md"
                            >
                                <Pencil size={18} />
                                Customize
                            </button>
                            <button
                                onClick={() => navigate('/settings')}
                                className="flex items-center gap-2 px-5 py-2 bg-primary-yellow text-primary-navy-dark rounded-full hover:bg-white font-bold transition-all shadow-lg border border-primary-yellow/50"
                            >
                                <SettingsIcon size={18} />
                                Settings
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <main className="max-w-7xl mx-auto pt-6 pb-12 px-4 sm:px-6 lg:px-8">
                {(!isOwner && !gamesHook.isProfilePublic) ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-primary-navy-dark rounded-xl shadow-lg relative overflow-hidden mt-8">
                        <div className="relative p-5 rounded-full mb-6">
                            <Lock className="text-purple-400" size={56} strokeWidth={1.5} />
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-3 tracking-wide">Private Profile</h3>
                        <p className="text-gray-400 max-w-md text-center leading-relaxed">
                            {username} has chosen to keep their profile private.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Tab Navigation */}
                        <div className="border-b border-gray-700 mb-8">
                            <nav className="-mb-px flex space-x-8">
                                {tabs.map((tab) => {
                                    // Comprobar active exacto para stats ('/profile/username') y parcial para otros
                                    const isActive =
                                        tab.path === `/profile/${username}`
                                            ? currentPath === tab.path
                                            : currentPath.startsWith(tab.path);

                                    const Icon = tab.icon;

                                    return (
                                        <Link
                                            key={tab.name}
                                            to={tab.path}
                                            className={`
                                                flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                                ${isActive
                                                    ? 'border-primary-yellow text-primary-yellow'
                                                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                                                }
                                            `}
                                        >
                                            <Icon className="mr-2" size={18} />
                                            {tab.name}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Pasamos el hook entero y el estado isOwner usando context */}
                        <Outlet context={{ ...gamesHook, isOwner }} />
                    </>
                )}
            </main>

            {/* Customization Options Modal */}
            {isCustomizationModalOpen && isOwner && (
                <div className="fixed inset-0 z-[300] bg-black bg-opacity-70 flex items-center justify-center p-4">
                    <div className="bg-primary-navy border border-gray-700 rounded-xl max-w-lg w-full p-6 relative">
                        <button
                            onClick={() => setIsCustomizationModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                        <h3 className="text-xl font-bold text-white mb-6">Customize Profile</h3>

                        <div className="space-y-6">
                            {/* Avatar Section */}
                            <div>
                                <h4 className="text-gray-400 font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <UserIcon size={16} /> Avatar
                                </h4>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setIsCustomizationModalOpen(false);
                                            handleAvatarClick();
                                        }}
                                        className="flex-1 py-3 px-4 bg-primary-navy-dark hover:bg-gray-800 border border-gray-700 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Camera size={18} />
                                        Change Avatar
                                    </button>
                                    {user?.avatar_url && !user.avatar_url.includes('default') && (
                                        <button
                                            onClick={() => {
                                                setIsCustomizationModalOpen(false);
                                                handleDeleteAvatar();
                                            }}
                                            className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 font-medium flex items-center justify-center transition-colors"
                                            title="Delete Avatar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Banner Section */}
                            <div>
                                <h4 className="text-gray-400 font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <ImageIcon size={16} /> Cover Banner
                                </h4>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setIsCustomizationModalOpen(false);
                                            handleBannerClick();
                                        }}
                                        className="flex-1 py-3 px-4 bg-primary-navy-dark hover:bg-gray-800 border border-gray-700 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Camera size={18} />
                                        Change Cover
                                    </button>
                                    {user?.banner_url && (
                                        <button
                                            onClick={() => {
                                                setIsCustomizationModalOpen(false);
                                                handleDeleteBanner();
                                            }}
                                            className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 font-medium flex items-center justify-center transition-colors"
                                            title="Delete Banner"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileLayout;
