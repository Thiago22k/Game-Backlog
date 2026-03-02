import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from '../../api/axios'; // Importar axios interceptor
import usePageTitle from '../../hooks/usePageTitle';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    usePageTitle('Forgot Password');

    // Imágenes de fondo aleatorias
    const backgroundImages = [
        'https://images.igdb.com/igdb/image/upload/t_1080p/co5vmg.jpg', // Baldur's Gate 3
        'https://images.igdb.com/igdb/image/upload/t_1080p/co6kz7.jpg', // Elden Ring
        'https://images.igdb.com/igdb/image/upload/t_1080p/co5w4u.jpg', // The Witcher 3
        'https://images.igdb.com/igdb/image/upload/t_1080p/co1r7f.jpg', // God of War
    ];

    const [randomBg] = useState(() =>
        backgroundImages[Math.floor(Math.random() * backgroundImages.length)]
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await axios.post('/auth/forgot-password', { email });
            setSuccess(true);
            toast.success(response.data.message || 'If an account with that email exists, we sent you a password reset link.');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-primary-navy relative overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                    backgroundImage: `url('${randomBg}')`,
                    filter: 'blur(8px) brightness(0.4)',
                }}
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-primary-navy/60" />

            {/* Content */}
            <div className="relative z-10">

                <div className="flex items-center justify-center px-4 pt-32 pb-12 min-h-screen">
                    <div className="w-full max-w-md z-10">
                        <div className="bg-primary-navy-ultra-dark rounded-2xl p-10 shadow-2xl h-full">
                            <h2 className="text-primary-yellow font-bold text-3xl mb-8 text-center uppercase tracking-wide">
                                Forgot Password
                            </h2>

                            {success ? (
                                <div className="text-center">
                                    <p className="text-white mb-6">
                                        If an account exists with <strong>{email}</strong>, a password reset link has been sent. Please check your inbox.
                                    </p>
                                    <Link to="/login" className="inline-block mt-4 text-primary-yellow hover:text-white transition-colors underline">
                                        Return to Login
                                    </Link>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <p className="text-gray-300 text-sm text-center mb-6">
                                        Enter your email address to receive a password reset link.
                                    </p>
                                    <div>
                                        <label className="block text-white text-sm mb-2">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            disabled={isLoading}
                                            className="w-full bg-white bg-opacity-10 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow placeholder-gray-500 disabled:opacity-50"
                                            placeholder="Enter your email"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-primary-yellow hover:bg-opacity-90 text-primary-navy font-bold py-3 px-8 rounded-lg uppercase tracking-wide transition-all disabled:opacity-50"
                                    >
                                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                                    </button>

                                    <div className="mt-8 space-y-3 text-center">
                                        <Link to="/login" className="block text-gray-400 hover:text-white text-sm transition-all">
                                            ← Back to login
                                        </Link>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
