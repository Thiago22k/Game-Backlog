import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatIGDBImage } from '../../utils/formatters';

const ScreenshotLightbox = ({ screenshots, initialIndex = 0, isOpen, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isClosing, setIsClosing] = useState(false);

    // Estados para la lógica de swipe (deslizar)
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const minSwipeDistance = 50; // Distancia mínima en píxeles para considerar que fue un swipe

    // Sincronizar estado cuando el modal se abre
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            setIsClosing(false);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            setIsClosing(false);
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [initialIndex, isOpen]);

    // Manejar el cierre con animación
    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 300);
    }, [onClose]);

    // Navegación
    const handleNext = useCallback((e) => {
        if (e) e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % screenshots.length);
    }, [screenshots]);

    const handlePrev = useCallback((e) => {
        if (e) e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + screenshots.length) % screenshots.length);
    }, [screenshots]);

    // Lógica de gestos táctiles
    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) handleNext();
        if (isRightSwipe) handlePrev();
    };

    // Navegación por teclado
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;
            if (e.key === 'Escape') handleClose();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleClose, handleNext, handlePrev]);

    if (!isOpen || !screenshots || screenshots.length === 0) return null;

    return (
        <div
            className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-lg transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
            onClick={handleClose}
        >
            {/* Botón Cerrar */}
            <button
                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                className="absolute top-6 right-6 p-2 text-white/70 hover:text-white transition-all z-10"
                title="Close (Esc)"
            >
                <X size={28} />
            </button>

            {/* Botón Anterior */}
            {screenshots.length > 1 && (
                <button
                    onClick={handlePrev}
                    className="hidden md:block absolute left-4 md:left-8 p-3 text-white/70 hover:text-white transition-all z-10"
                    title="Previous (Left Arrow)"
                >
                    <ChevronLeft size={40} />
                </button>
            )}

            {/* Contenedor de la Imagen con Eventos Táctiles */}
            <div
                className="max-w-[90vw] max-h-[90vh] relative flex items-center justify-center touch-pan-y"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <img
                    src={formatIGDBImage(screenshots[currentIndex].url, 't_original')}
                    alt={`Screenshot ${currentIndex + 1}`}
                    className={`max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl transition-all duration-300 select-none ${isClosing ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`}
                    draggable="false"
                />

                {/* Contador */}
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white/70 text-sm font-medium tracking-widest bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-md">
                    {currentIndex + 1} / {screenshots.length}
                </div>
            </div>

            {/* Botón Siguiente */}
            {screenshots.length > 1 && (
                <button
                    onClick={handleNext}
                    className="hidden md:block absolute right-4 md:right-8 p-3 text-white/70 hover:text-white transition-all z-10"
                    title="Next (Right Arrow)"
                >
                    <ChevronRight size={40} />
                </button>
            )}
        </div>
    );
};

export default ScreenshotLightbox;