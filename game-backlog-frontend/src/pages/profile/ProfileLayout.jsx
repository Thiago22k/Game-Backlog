import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { Trophy, Star, LayoutDashboard, Gamepad2, Library, Lock, Camera, Trash2, Pencil, X, Settings as SettingsIcon, Image as ImageIcon, User as UserIcon, Link as LinkIcon, LayoutList, Heart, Flag } from 'lucide-react';
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
import usePageTitle from '../../hooks/usePageTitle';
import { ASSETS_BASE_URL } from '../../utils/constants';
import { sanitizeSocialHandle } from '../../utils/sanitize';
import ConfirmModal from '../../components/common/ConfirmModal';
import { getAvatarUrl } from '../../utils/avatar';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Validates an image file for its MIME type and size.
 * @param {File} file - The file to validate.
 * @param {Object} options - Validation options.
 * @param {number} options.maxSizeMB - Maximum allowed size in Megabytes.
 * @param {boolean} options.allowGif - Whether GIF is allowed.
 * @returns {Object} { valid: boolean, error: string | null }
 */
const validateImageFile = (file, { maxSizeMB, allowGif = false }) => {
    const allowed = allowGif ? ALLOWED_IMAGE_TYPES : ALLOWED_IMAGE_TYPES.filter(t => t !== 'image/gif');

    if (!allowed.includes(file.type)) {
        return { valid: false, error: allowGif ? 'Only JPG, PNG, WebP or GIF images are allowed' : 'Only JPG, PNG or WebP images are allowed' };
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
        return { valid: false, error: `File size exceeds the limit (${maxSizeMB}MB)` };
    }
    return { valid: true, error: null };
};

const ProfileLayout = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const { username } = useParams();
    const location = useLocation();
    const gamesHook = useGames();
    const { games, getUserGames } = gamesHook;
    const { collections, getUserCollections } = useCollections();

    const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportDetails, setReportDetails] = useState('');
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    // Status for the custom ConfirmModal
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'default',
        isLoading: false
    });

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

        const isGif = file.type === 'image/gif';
        const validation = validateImageFile(file, {
            maxSizeMB: isGif ? 8 : 5,
            allowGif: true
        });

        if (!validation.valid) {
            toast.error(validation.error);
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const toastId = toast.loading('Uploading image...');
            const res = await axios.post('/users/avatar', formData);
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
        setConfirmModal({
            isOpen: true,
            title: 'Remove Avatar',
            message: 'Are you sure you want to remove your custom avatar? This action cannot be undone.',
            variant: 'default',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }));
                try {
                    await axios.delete('/users/avatar');
                    toast.success('Avatar removed');
                    updateUser({ avatar_url: null });
                } catch (error) {
                    toast.error(error.response?.data?.error || 'Error removing avatar');
                } finally {
                    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => { }, variant: 'default', isLoading: false });
                }
            }
        });
    };

    const handleBannerFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const validation = validateImageFile(file, {
            maxSizeMB: 10,
            allowGif: false
        });

        if (!validation.valid) {
            toast.error(validation.error);
            return;
        }

        const formData = new FormData();
        formData.append('banner', file);

        try {
            const toastId = toast.loading('Uploading banner...');
            const res = await axios.post('/users/banner', formData);
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
        setConfirmModal({
            isOpen: true,
            title: 'Remove Banner',
            message: 'Are you sure you want to remove your custom banner? This action will reset your profile header to its default appearance.',
            variant: 'default',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }));
                try {
                    await axios.delete('/users/banner');
                    toast.success('Banner removed');
                    updateUser({ banner_url: null });
                } catch (error) {
                    toast.error(error.response?.data?.error || 'Error removing banner');
                } finally {
                    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => { }, variant: 'default', isLoading: false });
                }
            }
        });
    };

    const handleShareProfile = () => {
        const profileUrl = window.location.origin + `/profile/${username}`;
        navigator.clipboard.writeText(profileUrl);
        toast.success('Profile link copied to clipboard!');
    };

    const handleReportProfile = () => {
        setIsReportModalOpen(true);
    };

    const handleSubmitReport = async (e) => {
        e.preventDefault();
        if (!reportReason) {
            toast.error('Please select a reason');
            return;
        }

        setIsSubmittingReport(true);

        // Simular envío
        await new Promise(resolve => setTimeout(resolve, 1000));

        toast.success('Report submitted successfully. Thank you for helping us keep the community safe!', {
            duration: 5000,
            icon: '✅'
        });

        setIsReportModalOpen(false);
        setReportReason('');
        setReportDetails('');
        setIsSubmittingReport(false);
    };


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
    const bannerImage = displayBanner ? `${ASSETS_BASE_URL}${displayBanner}` : null;

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
                                    <img
                                        src={getAvatarUrl(user, { animated: true })}
                                        alt="Avatar"
                                        className="w-full h-full object-cover bg-primary-navy-dark"
                                    />
                                ) : (
                                    <img
                                        src={getAvatarUrl({
                                            avatar_url: gamesHook.profileAvatarUrl,
                                            avatar_static_url: gamesHook.profileAvatarStaticUrl
                                        }, { animated: true })}
                                        alt="Avatar"
                                        className="w-full h-full object-cover bg-primary-navy-dark"
                                    />
                                )}
                            </div>
                            {/* Hidden inputs keep existing functionality */}
                            {isOwner && (
                                <>
                                    <input
                                        type="file"
                                        ref={hiddenFileInputRef}
                                        className="hidden"
                                        accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
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
                                {(!isOwner && user) && (
                                    <button
                                        onClick={handleReportProfile}
                                        className="text-white/30 hover:text-red-400 transition-colors mt-2"
                                        title="Report Profile"
                                    >
                                        <Flag size={18} strokeWidth={2.5} />
                                    </button>
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
                                            href={`https://twitch.tv/${sanitizeSocialHandle(profileSocialTwitch)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title={`Twitch: ${sanitizeSocialHandle(profileSocialTwitch)}`}
                                            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/20 hover:bg-black/40 backdrop-blur-sm border border-white/10 text-white text-xs font-medium transition-colors"
                                        >
                                            <TwitchIcon className="w-4 h-4" />
                                            {sanitizeSocialHandle(profileSocialTwitch)}
                                        </a>
                                    )}
                                    {profileSocialDiscord && (
                                        <span
                                            title={`Discord: ${sanitizeSocialHandle(profileSocialDiscord)}`}
                                            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/20 backdrop-blur-sm border border-white/10 text-white text-xs font-medium cursor-default select-all"
                                        >
                                            <DiscordIcon className="w-4 h-4" />
                                            {sanitizeSocialHandle(profileSocialDiscord)}
                                        </span>
                                    )}
                                    {profileSocialSteam && (
                                        <a
                                            href={`https://steamcommunity.com/id/${sanitizeSocialHandle(profileSocialSteam)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title={`Steam: ${sanitizeSocialHandle(profileSocialSteam)}`}
                                            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/20 hover:bg-black/40 backdrop-blur-sm border border-white/10 text-white text-xs font-medium transition-colors"
                                        >
                                            <SteamIcon className="w-4 h-4" />
                                            {sanitizeSocialHandle(profileSocialSteam)}
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
                        <Outlet context={{ ...gamesHook, collections, isOwner }} />
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

            {/* Report Profile Modal */}
            {isReportModalOpen && (
                <div className="fixed inset-0 z-[300] bg-black bg-opacity-70 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-primary-navy border border-gray-700/50 rounded-xl max-w-lg w-full p-6 relative shadow-2xl">
                        <button
                            onClick={() => {
                                setIsReportModalOpen(false);
                                setReportReason('');
                                setReportDetails('');
                            }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-red-500/10 rounded-lg">
                                <Flag size={20} className="text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Report Profile</h3>
                        </div>

                        <form onSubmit={handleSubmitReport} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Reason</label>
                                <select
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    className="w-full bg-primary-navy-dark border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary-yellow transition-colors"
                                    required
                                >
                                    <option value="" disabled>Select a reason...</option>
                                    <option value="inappropriate_avatar">Inappropriate Avatar</option>
                                    <option value="inappropriate_banner">Inappropriate Banner</option>
                                    <option value="inappropriate_bio">Inappropriate Bio</option>
                                    <option value="harassment">Harassment or Hate Speech</option>
                                    <option value="impersonation">Impersonation</option>
                                    <option value="spam">Spam</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Additional Details (Optional)</label>
                                <textarea
                                    value={reportDetails}
                                    onChange={(e) => setReportDetails(e.target.value)}
                                    placeholder="Provide any extra context..."
                                    className="w-full bg-primary-navy-dark border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-yellow transition-colors min-h-[120px] resize-none"
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsReportModalOpen(false);
                                        setReportReason('');
                                        setReportDetails('');
                                    }}
                                    className="flex-1 py-3 px-4 bg-gray-800/50 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors border border-gray-700/50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingReport || !reportReason}
                                    className="flex-[2] py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:hover:bg-red-50"
                                >
                                    {isSubmittingReport ? 'Sending Report...' : 'Submit Report'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
                isLoading={confirmModal.isLoading}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => { }, variant: 'default', isLoading: false })}
            />
        </div>
    );
};

export default ProfileLayout;
