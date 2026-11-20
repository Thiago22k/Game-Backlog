import React from 'react';
import { Star, StarHalf } from 'lucide-react';

const RatingBadge = ({ rating, size = 'sm', className = '', type = 'score' }) => {
    // If it's a star rating, render a row of stars
    if (type === 'stars') {
        const display = Number(rating) || 0;

        const getColor = (value) => {
            if (value <= 2) return '#ef4444'; // Red
            if (value <= 3.5) return '#f97316'; // Orange
            return '#22c55e'; // Green
        };
        const accentColor = display > 0 ? getColor(display) : '#6b7280';

        const getFill = (star) => {
            if (display >= star) return 'full';
            if (display >= star - 0.5) return 'half';
            return 'empty';
        };

        const sizeClasses = {
            sm: 16, // Smaller than the 28px default
            md: 20,
            lg: 28
        };
        const iconSize = sizeClasses[size];

        return (
            <div className={`flex items-center gap-1 ${className}`}>
                <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                        const fill = getFill(star);
                        return (
                            <div key={star} className="relative" style={{ width: iconSize, height: iconSize }}>
                                {/* Base — gray */}
                                <Star size={iconSize} className="absolute inset-0" style={{ color: '#374151', fill: '#374151' }} />
                                {/* Filled overlay */}
                                {fill !== 'empty' && (
                                    <span
                                        className="absolute inset-0 overflow-hidden"
                                        style={{ clipPath: fill === 'half' ? 'inset(0 50% 0 0)' : 'none' }}
                                    >
                                        <Star size={iconSize} style={{ color: accentColor, fill: accentColor }} />
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Default: IGDB Score Badge
    const getSVGColorClass = (score) => {
        if (!score) return 'fill-gray-600 text-white';
        if (score >= 80) return 'fill-green-500 text-primary-navy-dark';
        if (score >= 60) return 'fill-primary-yellow text-primary-navy-dark';
        if (score >= 40) return 'fill-orange-500 text-white';
        return 'fill-red-500 text-white';
    };

    const colorClass = getSVGColorClass(rating);
    const displayRating = rating ? Math.round(rating) : 'N/A';

    // Dimensions based on size for the badge
    const badgeSizeClasses = {
        sm: 'w-10 h-14 text-sm',
        md: 'w-12 h-16 text-base',
        lg: 'w-16 h-24 text-xl'
    };

    return (
        <div className={`relative flex items-center justify-center ${badgeSizeClasses[size]} font-bold drop-shadow-md ${className}`}>
            <svg
                className={`absolute inset-0 w-full h-full ${colorClass.split(' ')[0]} drop-shadow-sm`}
                version="1.0" xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 753 1080"
                preserveAspectRatio="none"
            >
                <g transform="translate(0,1080) scale(0.1,-0.1)" stroke="none">
                    <path d="M823 10785 c-203 -37 -382 -132 -528 -279 -133 -135 -214 -275 -268
          -464 l-22 -77 -3 -4979 c-2 -4750 -1 -4978 15 -4974 10 3 858 442 1886 976
          l1867 972 1865 -970 c1025 -534 1871 -973 1880 -976 14 -6 15 509 13 4982 l-3
          4989 -23 80 c-30 103 -100 250 -156 329 -48 68 -168 186 -237 233 -90 62 -198
          111 -319 146 l-75 22 -2910 1 c-2356 2 -2924 0 -2982 -11z"/>
                </g>
            </svg>
            <span className={`relative z-10 ${colorClass.split(' ')[1]} pb-2`}>
                {displayRating}
            </span>
        </div>
    );
};

export default RatingBadge;
