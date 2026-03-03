import React, { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import reviewService from '../../api/review.service';
import ReviewPreviewCard from '../../components/reviews/ReviewPreviewCard';
import { Loader2, Star } from 'lucide-react';

const REVIEWS_PER_PAGE = 10;

const ProfileReviews = () => {
    const { username } = useParams();
    const { isOwner } = useOutletContext();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);

    const fetchReviews = async (offset = 0) => {
        try {
            if (offset === 0) setLoading(true);
            else setLoadingMore(true);

            const data = await reviewService.getUserReviews(username, { limit: REVIEWS_PER_PAGE, offset });

            if (offset === 0) {
                setReviews(data.reviews);
            } else {
                setReviews(prev => [...prev, ...data.reviews]);
            }

            setHasMore(data.hasMore);
            setTotal(data.total);
            setError(null);
        } catch (err) {
            console.error('Error fetching user reviews:', err);
            setError('Failed to load reviews.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        setReviews([]);
        fetchReviews(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username]);

    if (loading && reviews.length === 0) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-yellow"></div>
            </div>
        );
    }

    if (error && reviews.length === 0) {
        return (
            <div className="text-center py-20 bg-primary-navy-dark rounded-xl mt-6">
                <h3 className="text-xl font-bold text-red-400 mb-2">Oops! Something went wrong</h3>
                <p className="text-gray-400">{error}</p>
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <div className="text-center py-16 bg-primary-navy-dark rounded-xl mt-6">
                <div className="flex justify-center mb-4">
                    <div className="p-4 bg-primary-navy rounded-full">
                        <Star size={32} className="text-gray-500" />
                    </div>
                </div>
                <p className="text-gray-400 mb-6">
                    {isOwner
                        ? "You haven't written any reviews yet."
                        : `${username} hasn't written any reviews yet.`}
                </p>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <h2 className="text-2xl font-bold text-white mb-6">Reviews <span className="text-gray-500 text-lg font-normal">({total})</span></h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {reviews.map(review => (
                    <ReviewPreviewCard key={review.id} review={review} />
                ))}
            </div>

            {hasMore && (
                <div className="flex justify-center mt-10">
                    <button
                        onClick={() => fetchReviews(reviews.length)}
                        disabled={loadingMore}
                        className="flex items-center gap-2 px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 border border-gray-700 hover:border-gray-500 shadow-md"
                    >
                        {loadingMore ? (
                            <>
                                <Loader2 size={18} className="animate-spin text-primary-yellow" />
                                Loading...
                            </>
                        ) : (
                            'Load More'
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProfileReviews;
