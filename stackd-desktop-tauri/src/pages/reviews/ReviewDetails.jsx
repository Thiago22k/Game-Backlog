import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios from '../../api/axios';
import { ENDPOINTS } from '../../utils/constants';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import ReviewCard from '../../components/reviews/ReviewCard';
import ReviewModal from '../../components/reviews/ReviewModal';
import { useAuth } from '../../context/AuthContext';
import NotFound from '../NotFound';

const ReviewDetails = () => {
    const { reviewId } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    const [review, setReview] = useState(null);
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchReviewDetails = async () => {
            setLoading(true);
            try {
                // Fetch Review
                const reviewRes = await axios.get(ENDPOINTS.REVIEWS.GET_REVIEW(reviewId));
                if (!isMounted) return;

                const reviewData = reviewRes.data;
                setReview(reviewData);

                // Fetch Game Background
                if (reviewData.igdb_game_id) {
                    const gameRes = await axios.get(`${ENDPOINTS.GAMES.SEARCH.replace('/search', '')}/igdb/${reviewData.igdb_game_id}`);
                    if (isMounted && gameRes.data.game) {
                        setGame(gameRes.data.game);
                    }
                }
            } catch (err) {
                console.error('Error fetching review details:', err);
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (reviewId) fetchReviewDetails();
        return () => { isMounted = false; };
    }, [reviewId, isAuthenticated]); // Re-fetch if auth changes to update 'has_liked'

    if (loading) {
        return (
            <div className="min-h-screen bg-primary-navy">
                <Navbar />
                <div className="flex items-center justify-center h-[80vh]">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary-yellow" />
                </div>
            </div>
        );
    }

    if (error || !review) return <NotFound />;

    const bannerUrl = game?.screenshots?.[0]?.image_id
        ? `https://images.igdb.com/igdb/image/upload/t_1080p/${game.screenshots[0].image_id}.jpg`
        : game?.artworks?.[0]?.image_id
            ? `https://images.igdb.com/igdb/image/upload/t_1080p/${game.artworks[0].image_id}.jpg` : '';

    return (
        <div className="min-h-screen bg-primary-navy">
            <Navbar />

            {/* Hero Banner Area */}
            <div className={`relative w-full overflow-hidden border-b border-gray-800 ${bannerUrl ? 'h-64 md:h-80' : 'h-32'}`}>
                {bannerUrl ? (
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${bannerUrl})` }}
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-navy-dark to-gray-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-primary-navy via-primary-navy/80 to-transparent" />

                <div className="absolute bottom-0 left-0 w-full px-4 sm:px-6 lg:px-8 pb-8 max-w-5xl mx-auto flex items-end">
                    <div>
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm w-fit bg-black/40 px-3 py-1.5 rounded-lg backdrop-blur-sm"
                        >
                            <ArrowLeft size={16} />
                            Go Back
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-50">
                <div className="rounded-xl">
                    <ReviewCard
                        review={review}
                        onReviewDeleted={() => navigate(-1)}
                        onReviewUpdated={() => setIsReviewModalOpen(true)}
                        hideFullReviewLink={true}
                    />
                </div>
            </main>

            {isReviewModalOpen && (
                <ReviewModal
                    isOpen={isReviewModalOpen}
                    onClose={() => setIsReviewModalOpen(false)}
                    game={game || { id: review.igdb_game_id, name: review.game_name, slug: review.game_slug }}
                    existingReview={review}
                    onSaveSuccess={() => {
                        axios.get(ENDPOINTS.REVIEWS.GET_REVIEW(reviewId))
                            .then(res => setReview(res.data))
                            .catch(err => console.error(err));
                        setIsReviewModalOpen(false);
                    }}
                />
            )}

            <Footer />
        </div>
    );
};

export default ReviewDetails;
