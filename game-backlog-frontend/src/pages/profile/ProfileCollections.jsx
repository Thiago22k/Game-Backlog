import { Library } from 'lucide-react';

const ProfileCollections = () => {
    return (
        <div className="text-center py-20 bg-primary-navy-dark border border-gray-700 rounded-xl">
            <div className="flex justify-center mb-6">
                <div className="p-4 bg-primary-navy rounded-full">
                    <Library size={48} className="text-gray-500" />
                </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
                Collections
            </h3>
            <p className="text-gray-400 max-w-md mx-auto mb-8">
                Create custom lists for your favorite genres, franchises, or "games to play on Halloween". This feature is currently in development.
            </p>
            <button
                disabled
                className="px-6 py-2 bg-gray-700 text-gray-400 rounded-lg font-semibold cursor-not-allowed"
            >
                Coming Soon
            </button>
        </div>
    );
};

export default ProfileCollections;
