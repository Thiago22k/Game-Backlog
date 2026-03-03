import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { REVIEW_SUB_STATUSES } from '../../utils/constants';
import reviewService from '../../api/review.service';
import StarRating from '../games/StarRating';
import CustomSelect from '../common/CustomSelect';

const ReviewModal = ({ isOpen, onClose, game, existingReview = null, onSaveSuccess }) => {
    const [rating, setRating] = useState(parseFloat(existingReview?.rating) || 0);
    const [hoverRating, setHoverRating] = useState(0); // Estado para la animación de las estrellas
    const [status, setStatus] = useState(existingReview?.status || 'completed');
    const [subStatus, setSubStatus] = useState(existingReview?.sub_status || '');
    const [platform, setPlatform] = useState(existingReview?.platform || '');
    const [containsSpoiler, setContainsSpoiler] = useState(existingReview?.contains_spoiler || false);
    const [content, setContent] = useState(existingReview?.content || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Resetear form cuando se abre/cierra o cambia la reseña existente
    useEffect(() => {
        if (isOpen) {
            setRating(parseFloat(existingReview?.rating) || 0);
            setStatus(existingReview?.status || 'completed');
            setSubStatus(existingReview?.sub_status || '');
            setPlatform(existingReview?.platform || '');
            setContainsSpoiler(existingReview?.contains_spoiler || false);
            setContent(existingReview?.content || '');
            setError(null);
            setHoverRating(0);
        }
    }, [isOpen, existingReview]);

    // Limpiar sub-estado si cambia el estado principal
    useEffect(() => {
        if (existingReview?.status === status) {
            setSubStatus(existingReview?.sub_status || '');
        } else {
            setSubStatus('');
        }
    }, [status, existingReview]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (Number(rating) <= 0) {
            setError('Please select a rating of at least 1 star.');
            return;
        }

        if (!platform) {
            setError('Please select a platform.');
            return;
        }

        if (!content || content.trim() === '') {
            setError('Please write something in your review.');
            return;
        }

        setIsSubmitting(true);

        try {
            await reviewService.saveReview(game.id, {
                rating,
                status,
                subStatus,
                platform,
                containsSpoiler,
                content
            });
            onSaveSuccess();
            onClose();
        } catch (err) {
            setError(err.message || 'Error saving review');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper para opciones de plataformas
    const getPlatformOptions = () => {
        if (!game || !game.platforms) return [];
        return game.platforms.map(p => typeof p === 'object' ? p.name : p);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            {/* Contenedor principal: Fondo #12141d, sin bordes */}
            <div className="bg-[#12141d] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl flex flex-col">

                {/* Header estático */}
                <div className="sticky top-0 bg-[#12141d] z-10 px-8 py-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-wide">
                            {existingReview ? 'Edit Review' : 'Write Review'}
                        </h2>
                        {game?.name && (
                            <p className="text-gray-400 text-sm mt-1">for {game.name}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-[#ffde59] transition-colors p-2 rounded-full hover:bg-white/5"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-8">

                    {error && (
                        <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-sm flex items-center gap-3">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    {/* Star Rating */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-3">Your Rating</label>
                        <div className="flex items-center gap-4">
                            <StarRating
                                rating={rating}
                                onRate={(val) => setRating(val)}
                                interactive={true}
                                size={32}
                                gap={4}
                            />
                            {rating > 0 && (
                                <span className="text-xl font-bold text-white bg-white/5 px-3 py-1 rounded-lg">
                                    {rating.toFixed(1)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Grid de Selects (Inputs planos #1b1e2a) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                            <CustomSelect
                                options={[
                                    { value: 'completed', label: 'Completed' },
                                    { value: 'playing', label: 'Playing' },
                                    { value: 'backlog', label: 'Backlog' },
                                    { value: 'dropped', label: 'Dropped' }
                                ]}
                                value={status}
                                onChange={(val) => setStatus(val)}
                                containerClassName="w-full"
                                className="w-full bg-primary-navy-ultra-dark py-3.5"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Sub-Status</label>
                            <CustomSelect
                                options={[
                                    { value: '', label: '-- Optional --' },
                                    ...(REVIEW_SUB_STATUSES[status] || [])
                                ]}
                                value={subStatus}
                                onChange={(val) => setSubStatus(val)}
                                disabled={!REVIEW_SUB_STATUSES[status]}
                                containerClassName="w-full"
                                className="w-full bg-primary-navy-ultra-dark py-3.5"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Platform</label>
                            <CustomSelect
                                options={[
                                    { value: '', label: '-- Select Platform --' },
                                    ...getPlatformOptions().map(p => ({ value: p, label: p }))
                                ]}
                                value={platform}
                                onChange={(val) => setPlatform(val)}
                                containerClassName="w-full"
                                className="w-full bg-primary-navy-ultra-dark py-3.5"
                            />
                        </div>
                    </div>

                    {/* EL BLOQUE GRANDE DE SPOILERS HA SIDO ELIMINADO */}

                    {/* Textarea con Spoiler Toggle Subtil Integrado */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-400">Review</label>

                            {/* Sección Subtil Derecha (Toggle + Contador) */}
                            <div className="flex items-center gap-5">
                                {/* Toggle de Spoiler Ultra-Compacto */}
                                <div
                                    className="flex items-center gap-2 cursor-pointer group"
                                    onClick={() => setContainsSpoiler(!containsSpoiler)}
                                >
                                    <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors">Spoiler?</span>
                                    {/* El Toggle Switch Físico (Pequeño) */}
                                    <div className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-colors ${containsSpoiler ? 'bg-[#ffde59]' : 'bg-[#2a2f42]'}`}>
                                        <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${containsSpoiler ? 'translate-x-4' : ''}`}></div>
                                    </div>
                                </div>

                                {/* Contador de Caracteres */}
                                <span className={`text-xs ${content.length >= 3800 ? 'text-[#ffde59]' : 'text-gray-600'}`}>
                                    {content.length} / 4000
                                </span>
                            </div>
                        </div>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="What did you think about the game?..."
                            className="w-full bg-primary-navy rounded-xl px-4 py-4 text-gray-100 focus:outline-none focus:ring-1 focus:ring-[#ffde59] min-h-[160px] resize-y transition-shadow"
                            required
                            maxLength={4000}
                        ></textarea>
                    </div>

                    {/* Acciones */}
                    <div className="flex justify-end gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-8 py-3 rounded-xl font-bold bg-[#ffde59] text-[#12141d] hover:bg-[#e6c84f] transition-colors disabled:opacity-50 shadow-lg shadow-[#ffde59]/10"
                        >
                            {isSubmitting ? 'Saving...' : existingReview ? 'Update Review' : 'Publish Review'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReviewModal;