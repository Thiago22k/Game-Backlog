import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import usePageTitle from '../../hooks/usePageTitle';
import AuthLayout from '../../components/auth/AuthLayout';
import SteamIcon from '../../assets/steam-icon.svg?react';

// Decodifica el payload del JWT solo para previsualizar el avatar/nombre de Steam
// (la verificación real de firma ocurre en el backend en /api/steam/complete-signup).
const decodeTokenPreview = (token) => {
    try {
        const [, payload] = token.split('.');
        if (!payload) return null;
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(json);
    } catch {
        return null;
    }
};

const suggestUsername = (personaName) => {
    if (!personaName) return '';
    return personaName
        .replace(/[^a-zA-Z0-9_]/g, '')
        .slice(0, 15);
};

const SteamRegister = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { completeSteamSignup } = useAuth();

    usePageTitle('Complete Steam Sign Up');

    const token = searchParams.get('token') || '';
    const steamPreview = useMemo(() => decodeTokenPreview(token), [token]);

    const [formData, setFormData] = useState(() => ({
        username: suggestUsername(steamPreview?.persona_name),
        email: '',
        agreeTerms: false,
    }));
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!token || !steamPreview?.steamId) {
        return <Navigate to="/login?steam=invalid_state" replace />;
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const trimmedUsername = formData.username.trim();
        if (!trimmedUsername) {
            setError('Please choose a username');
            return;
        }
        if (trimmedUsername.length < 3 || trimmedUsername.length > 15) {
            setError('Username must be between 3 and 15 characters');
            return;
        }
        if (!formData.agreeTerms) {
            setError('You must agree to the Terms and Privacy Policy');
            return;
        }

        setIsLoading(true);

        const result = await completeSteamSignup({
            token,
            username: trimmedUsername,
            email: formData.email.trim(),
        });

        if (result.success) {
            const redirect = sessionStorage.getItem('redirectAfterLogin');
            sessionStorage.removeItem('redirectAfterLogin');

            const isRelative = (url) => url && url.startsWith('/') && !url.startsWith('//');
            navigate(isRelative(redirect) ? redirect : '/');
        } else {
            setError(result.error);
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="w-full">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00adee]/15 text-[#00adee] text-xs font-medium mb-4">
                    <SteamIcon className="w-3.5 h-3.5 fill-current" />
                    Steam Account Connected
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                    Finish setting up
                </h1>
                <p className="text-gray-400 text-sm mb-6">
                    Choose your Stackd username to complete your account.
                </p>

                {/* Steam Profile Preview */}
                <div className="flex items-center gap-3.5 bg-white/[0.05] border border-white/10 rounded-lg p-3.5 mb-6">
                    {steamPreview.avatar_url ? (
                        <img
                            src={steamPreview.avatar_url}
                            alt=""
                            className="w-11 h-11 rounded-md shrink-0"
                        />
                    ) : (
                        <div className="w-11 h-11 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                            <SteamIcon className="w-5 h-5 fill-[#00adee]" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate">
                            {steamPreview.persona_name || 'Steam User'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                            SteamID: {steamPreview.steamId}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Username Input */}
                    <div>
                        <label className="block text-white text-sm font-medium mb-2">
                            Username
                        </label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            maxLength={15}
                            disabled={isLoading}
                            className="w-full h-12 bg-white/[0.07] border border-white/15 focus:border-[#8b7cf6] text-white px-4 rounded-md focus:outline-none transition-colors placeholder-gray-500 text-sm disabled:opacity-50"
                            placeholder="Choose a username"
                        />
                        <p className="text-xs text-gray-400 mt-1.5">
                            3 to 15 characters. Letters, numbers and underscores.
                        </p>
                    </div>

                    {/* Optional Email Input */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-white text-sm font-medium">
                                Email
                            </label>
                            <span className="text-xs text-gray-500">Optional</span>
                        </div>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            disabled={isLoading}
                            className="w-full h-12 bg-white/[0.07] border border-white/15 focus:border-[#8b7cf6] text-white px-4 rounded-md focus:outline-none transition-colors placeholder-gray-500 text-sm disabled:opacity-50"
                            placeholder="you@email.com (recommended for recovery)"
                        />
                    </div>

                    {/* TOS Checkbox */}
                    <div className="pt-1">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                name="agreeTerms"
                                checked={formData.agreeTerms}
                                onChange={handleChange}
                                className="w-4 h-4 rounded-sm bg-white/10 border-white/20 text-primary-yellow focus:ring-0 accent-primary-yellow"
                            />
                            <span className="text-xs text-gray-300">
                                I agree to the{' '}
                                <Link to="/terms" target="_blank" className="text-purple-400 hover:underline">
                                    Terms
                                </Link>{' '}
                                and{' '}
                                <Link to="/privacy" target="_blank" className="text-purple-400 hover:underline">
                                    Privacy Policy
                                </Link>
                            </span>
                        </label>
                    </div>

                    {error && (
                        <div className="bg-red-500/15 border border-red-500/40 text-red-300 px-4 py-2.5 rounded-md text-xs">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 bg-primary-yellow hover:bg-yellow-400 text-primary-navy font-bold rounded-md transition-all shadow-md shadow-primary-yellow/10 disabled:opacity-50 text-sm mt-2"
                    >
                        {isLoading ? 'Creating account...' : 'Create account'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link to="/login" className="text-xs text-gray-400 hover:text-white transition-colors">
                        ← Back to login
                    </Link>
                </div>
            </div>
        </AuthLayout>
    );
};

export default SteamRegister;