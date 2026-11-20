
const SupporterBadge = ({ className = '' }) => {
    return (
        <div
            className={`supporter-pill relative inline-flex items-center justify-center gap-1.5 px-2.5 h-[0.8em] rounded-md cursor-pointer overflow-hidden group shadow-sm border border-primary-yellow/20 ${className}`}
            style={{ width: 'fit-content' }}
            title="Stackd Supporter"
        >
            <style>
                {`
                    .supporter-pill:hover .shine-overlay {
                      animation: shine 0.75s ease-in-out forwards;
                    }
                    @keyframes shine {
                      0% { left: -100%; }
                      100% { left: 100%; }
                    }
                `}
            </style>

            {/* Base Gradient Background */}
            <div className="absolute inset-0 bg-gradient-get-started opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>

            {/* Shine Animation overlay (Triggers on hover) */}
            <div
                className="shine-overlay absolute top-0 w-1/2 h-full pointer-events-none z-0"
                style={{
                    background: 'linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.4) 50%, rgba(255, 255, 255, 0) 100%)',
                    transform: 'skewX(-25deg)',
                    left: '-100%',
                }}
            ></div>

            {/* Content */}
            <span className="text-[0.4em] font-extrabold tracking-widest uppercase text-primary-navy-ultra-dark relative z-10 leading-none">
                Supporter
            </span>
        </div>
    );
};

export default SupporterBadge;
