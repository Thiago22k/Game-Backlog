import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import axios from '../../api/axios';
import { ENDPOINTS } from '../../utils/constants';
import InteractiveGameCard from './InteractiveGameCard';
import InteractiveGameCardSkeleton from './InteractiveGameCardSkeleton';
import toast from 'react-hot-toast';

const RecommendationSection = ({ isAuthenticated, onStatusChange, onRatingChange }) => {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }

        const fetchRecommendations = async () => {
            try {
                const response = await axios.get(`${ENDPOINTS.GAMES.RECOMMENDATIONS}?limit=4`);
                setGames(response.data.games);
            } catch (error) {
                console.error('Error fetching recommendations:', error);
                // Silently fail or show a subtle message
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, [isAuthenticated]);

    if (!isAuthenticated || (!loading && games.length === 0)) return null;

    return (
        <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold flex items-center text-white">
                    <Sparkles className="text-primary-yellow inline-block mr-2" size={24} />
                    Recommended for You
                </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <InteractiveGameCardSkeleton key={`rec-skel-${i}`} />
                    ))
                ) : (
                    games.map((game) => (
                        <InteractiveGameCard
                            key={game.id}
                            game={game}
                            interactive={isAuthenticated}
                            onStatusChange={onStatusChange}
                            onRatingChange={onRatingChange}
                        />
                    ))
                )}
            </div>
        </section>
    );
};

export default RecommendationSection;
