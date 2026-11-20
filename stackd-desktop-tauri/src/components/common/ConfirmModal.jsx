import { X, AlertTriangle } from 'lucide-react';

/**
 * Reusable confirmation modal.
 * 
 * @param {boolean} isOpen - Whether the modal is visible.
 * @param {string} title - Modal title.
 * @param {string} message - Modal message/body.
 * @param {string} confirmLabel - Text for the confirm button.
 * @param {string} cancelLabel - Text for the cancel button.
 * @param {function} onConfirm - Callback when confirmed.
 * @param {function} onCancel - Callback when cancelled or closed.
 * @param {string} variant - 'default' or 'danger'. Default uses yellow, danger uses red.
 * @param {boolean} isLoading - Whether the confirm action is in progress.
 */
const ConfirmModal = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    variant = 'default',
    isLoading = false
}) => {
    if (!isOpen) return null;

    const isDanger = variant === 'danger';

    return (
        <div className="fixed inset-0 z-[500] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-primary-navy border border-gray-700 rounded-xl max-w-md w-full p-6 relative shadow-2xl scale-110 animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    disabled={isLoading}
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${isDanger ? 'bg-red-500/20' : 'bg-primary-yellow/20'}`}>
                        <AlertTriangle className={isDanger ? 'text-red-400' : 'text-primary-yellow'} size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                </div>

                <p className="text-gray-300 mb-8 leading-relaxed">
                    {message}
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 py-2.5 px-4 rounded-lg font-bold transition-all disabled:opacity-70 flex items-center justify-center gap-2 ${isDanger
                                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                                : 'bg-primary-yellow hover:opacity-90 text-primary-navy-dark shadow-lg shadow-primary-yellow/10'
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Processing...
                            </>
                        ) : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
