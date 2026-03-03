import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import RatingBadge from '../common/RatingBadge';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { getAvatarUrl } from '../../utils/avatar';

const ReviewPreviewCard = ({ review }) => {
    const CONTENT_LIMIT = 150;
    const isTruncated = review.content && review.content.length > CONTENT_LIMIT;
    const displayedContent = isTruncated
        ? review.content.substring(0, CONTENT_LIMIT) + '...'
        : review.content;

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: enUS });
    };

    return (
        <div className="bg-primary-navy-dark rounded-xl p-4 transition-colors flex flex-col h-full">
            {/* Header: User & Game */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <Link to={`/profile/${review.username}`} className="flex-shrink-0 transition-transform hover:scale-105 active:scale-95">
                        <img
                            src={getAvatarUrl({
                                avatar_url: review.avatar_url,
                                avatar_static_url: review.avatar_static_url
                            }, { animated: false })}
                            alt={review.username}
                            className="w-10 h-10 rounded-full object-cover border border-gray-700 hover:border-primary-yellow transition-colors"
                            onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + review.username + '&background=random' }}
                        />
                    </Link>
                    <div>
                        <Link to={`/profile/${review.username}`} className="font-semibold text-white hover:text-primary-yellow transition-colors text-sm">
                            {review.username}
                        </Link>
                        <p className="text-xs text-gray-500">{formatDate(review.created_at)}</p>
                    </div>
                </div>
                {/* Rating Badge */}
                <RatingBadge rating={parseFloat(review.rating)} size="sm" type="stars" />
            </div>

            {/* Game Title */}
            <div className="mb-2">
                <span className="text-xs text-gray-400 mr-1">Review for</span>
                <Link to={`/game/${review.game_slug || review.igdb_game_id}`} className="font-bold text-primary-yellow hover:text-white transition-colors hover:underline decoration-primary-yellow/30 underline-offset-4 text-sm">
                    {review.game_name || 'Unknown Game'}
                </Link>
            </div>

            {/* Content Preview */}
            <div className="flex-grow mb-4">
                {review.contains_spoiler ? (
                    <div className="bg-white/5 p-3 rounded-lg border border-dashed border-white/20 select-none">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                            <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">
                                Spoiler Content
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 italic">This review contains spoilers. View full review to read.</p>
                    </div>
                ) : (
                    <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed break-words line-clamp-3">
                        {displayedContent}
                    </p>
                )}
            </div>

            {/* Footer Actions / Links */}
            <div className="mt-auto pt-3 border-t border-gray-800 flex justify-between items-center">
                <div className="flex gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                        </svg>
                        {review.likes_count || 0}
                    </div>
                    <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                        </svg>
                        {review.comments_count || 0}
                    </div>
                </div>
                <Link
                    to={`/profile/${review.username}/reviews/${review.id}`}
                    className="text-xs font-bold text-primary-yellow hover:text-white transition-colors"
                >
                    Read Full Review →
                </Link>
            </div>
        </div>
    );
};

export default ReviewPreviewCard;
