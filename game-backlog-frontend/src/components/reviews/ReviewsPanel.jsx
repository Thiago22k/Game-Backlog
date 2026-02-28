import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import reviewService from '../../api/review.service';
import { useAuth } from '../../context/AuthContext';
import ReviewCard from './ReviewCard';
import { MessageSquare } from 'lucide-react';

const ReviewsPanel = ({ game, onReviewUpdated, myReview, onRequestEditReview }) => {
    const { isAuthenticated, user } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadReviews = useCallback(async () => {
        if (!game?.id) return;
        setLoading(true);
        try {
            const data = await reviewService.getGameReviews(game.id);
            // Filtramos la reseña del usuario de la lista general si existe
            if (myReview) {
                setReviews(data.filter(r => r.id !== myReview.id));
            } else {
                setReviews(data);
            }
        } catch (error) {
            console.error('Error loading reviews:', error);
        } finally {
            setLoading(false);
        }
    }, [game?.id, isAuthenticated, user, myReview]);

    useEffect(() => {
        loadReviews();
    }, [loadReviews, myReview]);

    const location = useLocation();

    useEffect(() => {
        // Attempt to scroll to the review if a hash is present and reviews have loaded
        if (!loading && location.hash) {
            const id = location.hash.replace('#', '');
            const element = document.getElementById(id);
            if (element) {
                // Add a small delay to ensure rendering is complete before scrolling
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Optional: add a temporary highlight effect
                    element.classList.add('ring-2', 'ring-primary-yellow', 'transition-all', 'duration-1000');
                    setTimeout(() => {
                        element.classList.remove('ring-2', 'ring-primary-yellow');
                    }, 2000);
                }, 100);
            }
        }
    }, [loading, location.hash, reviews, myReview]);

    const handleSaveSuccess = () => {
        loadReviews();
        if (onReviewUpdated) onReviewUpdated();
    };

    if (loading) {
        return <div className="animate-pulse space-y-4">
            <div className="h-32 bg-primary-navy-dark rounded-xl"></div>
            <div className="h-32 bg-primary-navy-dark rounded-xl"></div>
        </div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header removido según solicitud */}

            {/* Mi Reseña */}
            {myReview && (
                <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-gray-500 tracking-widest pl-2">Your Review</h4>
                    <ReviewCard
                        review={myReview}
                        onReviewUpdated={onRequestEditReview}
                        onReviewDeleted={handleSaveSuccess}
                    />
                </div>
            )}

            {/* Reseñas de Otros */}
            {reviews.length > 0 ? (
                <div className="space-y-4">
                    {myReview && <h4 className="text-xs font-black uppercase text-gray-500 tracking-widest pl-2 mt-6">Other Reviews</h4>}
                    {reviews.map(review => (
                        <ReviewCard key={review.id} review={review} onReviewDeleted={handleSaveSuccess} />
                    ))}
                </div>
            ) : (
                !myReview && (
                    <div className="bg-primary-navy-dark border border-dashed border-gray-700 rounded-2xl p-12 text-center">
                        <MessageSquare size={48} className="mx-auto text-gray-600 mb-4" />
                        <p className="text-gray-400 font-medium">There are no reviews for this game yet.</p>
                        {isAuthenticated && (
                            <button
                                onClick={onRequestEditReview}
                                className="mt-4 text-primary-yellow font-bold hover:underline"
                            >
                                Be the first to share your opinion!
                            </button>
                        )}
                    </div>
                )
            )}

        </div>
    );
};

export default ReviewsPanel;
