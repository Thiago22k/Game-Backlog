const AnticipatedGameCardSkeleton = () => {
    return (
        <div className="bg-primary-navy-dark rounded-2xl overflow-hidden pointer-events-none">
            {/* Header con Countdown Placeholder */}
            <div className="h-12 flex items-center justify-between px-4">
                {/* Countdown Badge Placeholder */}
                <div className="h-6 w-24 rounded-full bg-gray-700 animate-pulse"></div>

                {/* IGDB Rating Placeholder (optional in real component, but good to have in skeleton for balance) */}
                <div className="w-8 h-8 rounded-lg bg-gray-700 animate-pulse"></div>
            </div>

            {/* Artwork Banner Placeholder */}
            <div className="mx-4 mb-8">
                <div className="w-full h-32 bg-gray-700 rounded-lg animate-pulse"></div>
            </div>

            {/* Cover Circular Placeholder */}
            <div className="flex justify-center -mt-12 mb-3 relative z-10">
                <div className="w-24 h-24 rounded-full bg-gray-600 animate-pulse border-4 border-primary-navy-dark"></div>
            </div>

            {/* Info Placeholder */}
            <div className="px-4 pb-4 text-center">
                {/* Title Placeholder */}
                <div className="min-h-[3rem] flex flex-col items-center justify-center gap-2 mb-1">
                    <div className="w-3/4 h-4 bg-gray-700 rounded animate-pulse"></div>
                </div>

                {/* Genre and Year Placeholder */}
                <div className="flex justify-center mt-2 mb-3">
                    <div className="w-1/3 h-3 bg-gray-600 rounded animate-pulse"></div>
                </div>

                {/* Wishlist Button Placeholder */}
                <div className="w-full h-10 rounded-lg bg-gray-700 animate-pulse"></div>
            </div>
        </div>
    );
};

export default AnticipatedGameCardSkeleton;
