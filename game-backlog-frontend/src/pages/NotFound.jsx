import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Compass, AlertCircle } from 'lucide-react';
import Navbar from '../components/layout/Navbar';

const NotFound = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Check context based on URL path
    const isProfileError = location.pathname.startsWith('/profile/');
    const isGameError = location.pathname.startsWith('/game/');
    const isCollectionError = location.pathname.startsWith('/collections/');

    let title = "Page Not Found";
    let description = "The page you are trying to reach has vanished into the digital void. Let's get you back to safe ground.";

    if (isProfileError) {
        title = "Player Not Found";
        description = "The user profile you're looking for doesn't exist. They might have changed their username or deleted their account.";
    } else if (isGameError) {
        title = "Game Not Found";
        description = "This game doesn't seem to exist in our database. It might have been removed or the URL is incorrect.";
    } else if (isCollectionError) {
        title = "Collection Not Found";
        description = "This collection doesn't exist or has been deleted by its owner.";
    }

    return (
        <div className="min-h-screen bg-primary-navy flex flex-col">
            <Navbar />

            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
                <div className="mb-8">
                    <AlertCircle className="w-32 h-32 text-primary-yellow opacity-90" strokeWidth={1.5} />
                </div>

                <h1 className="text-6xl md:text-8xl font-black text-white mb-4 tracking-tight">
                    404
                </h1>

                <h2 className="text-2xl md:text-3xl font-bold text-gray-300 mb-6">
                    {title}
                </h2>

                <p className="text-gray-400 max-w-md text-lg mb-10">
                    {description}
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-primary-yellow text-primary-navy-dark font-bold rounded-xl hover:bg-white hover:scale-105 transition-all shadow-lg"
                    >
                        <Home size={20} />
                        Return Home
                    </button>

                    <button
                        onClick={() => navigate('/explore')}
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-black/40 text-white font-bold rounded-xl border border-white/10 hover:bg-black/60 hover:border-white/30 backdrop-blur-md transition-all"
                    >
                        <Compass size={20} />
                        Explore Games
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
