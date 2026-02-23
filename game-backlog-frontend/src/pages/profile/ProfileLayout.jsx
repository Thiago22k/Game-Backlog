import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { Trophy, Star, LayoutDashboard, Gamepad2, Library, Lock, Camera, User, Trash2, Pencil, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGames } from '../../hooks/useGames';
import Navbar from '../../components/layout/Navbar';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import defaultAvatar from '../../assets/default_avatar.png';

const ProfileLayout = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const { username } = useParams();
    const location = useLocation();
    const gamesHook = useGames();
    const { games, getUserGames } = gamesHook;

    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

    const isOwner = user?.username === username;

    useEffect(() => {
        if (username) {
            getUserGames(username);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username]);

    // Lógica para subida de avatar
    const hiddenFileInputRef = useRef(null);

    const handleAvatarClick = () => {
        if (isOwner && hiddenFileInputRef.current) {
            hiddenFileInputRef.current.click();
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

    // Calcular estadísticas globales
    const stats = useMemo(() => {
        const ratedGames = games.filter(g => g.rating);
        return {
            total: games.length,
            completed: games.filter(g => g.status === 'completed').length,
            avgRating: ratedGames.length > 0
                ? (ratedGames.reduce((sum, g) => sum + g.rating, 0) / ratedGames.length).toFixed(1)
                : 0,
        };
    }, [games]);

    const tabs = [
        { name: 'Stats', path: `/profile/${username}`, icon: LayoutDashboard },
        { name: 'Games', path: `/profile/${username}/games`, icon: Gamepad2 },
        { name: 'Collections', path: `/profile/${username}/collections`, icon: Library },
    ];

    const currentPath = location.pathname;

    return (
        <div className="min-h-screen bg-primary-navy">
            <Navbar />

            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {/* Header con Stats */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div className="flex items-center gap-6">

                        {/* Avatar */}
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary-yellow bg-primary-navy-dark flex items-center justify-center">
                                {isOwner ? (
                                    <img src={user?.avatar_url ? `http://localhost:3000${user.avatar_url}` : defaultAvatar} alt="Avatar" className="w-full h-full object-cover bg-primary-navy-dark" />
                                ) : (
                                    <img src={gamesHook.profileAvatarUrl ? `http://localhost:3000${gamesHook.profileAvatarUrl}` : defaultAvatar} alt="Avatar" className="w-full h-full object-cover bg-primary-navy-dark" />
                                )}
                            </div>

                            {isOwner && (
                                <>
                                    <div className="absolute inset-0 bg-black/60 rounded-full flex gap-3 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setIsAvatarModalOpen(true)}
                                            className="p-3 hover:bg-white/20 rounded-full cursor-pointer transition-colors"
                                            title="Avatar options"
                                        >
                                            <Pencil className="text-white" size={24} />
                                        </button>
                                    </div>
                                    <input
                                        type="file"
                                        ref={hiddenFileInputRef}
                                        className="hidden"
                                        accept="image/png, image/jpeg, image/jpg"
                                        onChange={handleFileChange}
                                    />
                                </>
                            )}
                        </div>

                        <div>
                            <h2 className="text-3xl font-bold text-white">
                                {isOwner ? `Welcome back, ${user?.username}` : `${username}'s Profile`}
                            </h2>

                            {/* Stats */}
                            <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className="text-gray-400">
                                    {stats.total} game{stats.total !== 1 ? 's' : ''}
                                </span>
                                <span className="text-gray-600">•</span>
                                <span className="flex items-center gap-1 text-green-400">
                                    <Trophy size={14} />
                                    {stats.completed} completed
                                </span>
                                {stats.avgRating > 0 && (
                                    <>
                                        <span className="text-gray-600">•</span>
                                        <span className="flex items-center gap-1 text-primary-yellow">
                                            <Star size={14} fill="currentColor" />
                                            {stats.avgRating} avg
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {isOwner && (
                        <button
                            onClick={() => navigate('/settings')}
                            className="px-6 py-2 bg-primary-yellow text-primary-navy-dark rounded-lg hover:opacity-90 font-semibold transition-all"
                        >
                            Settings
                        </button>
                    )}
                </div>

                {(!isOwner && !gamesHook.isProfilePublic) ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-primary-navy-dark rounded-xl border border-gray-700 shadow-lg relative overflow-hidden mt-8">
                        {/* Decorative background circle */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />

                        <div className="relative p-5 bg-gray-800/50 rounded-full mb-6 border border-gray-700 shadow-inner">
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

            {/* Avatar Options Modal */}
            {isAvatarModalOpen && isOwner && (
                <div className="fixed inset-0 z-[300] bg-black bg-opacity-70 flex items-center justify-center p-4">
                    <div className="bg-primary-navy border border-gray-700 rounded-xl max-w-sm w-full p-6 relative">
                        <button
                            onClick={() => setIsAvatarModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                        <h3 className="text-xl font-bold text-white mb-6">Avatar Options</h3>

                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    setIsAvatarModalOpen(false);
                                    handleAvatarClick();
                                }}
                                className="w-full py-3 px-4 bg-primary-navy-dark hover:bg-gray-800 border border-gray-700 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                <Camera size={18} />
                                Change Avatar
                            </button>

                            {user?.avatar_url && !user.avatar_url.includes('default') && (
                                <button
                                    onClick={() => {
                                        setIsAvatarModalOpen(false);
                                        handleDeleteAvatar();
                                    }}
                                    className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 font-medium flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Trash2 size={18} />
                                    Delete Avatar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileLayout;
