import React, { useState } from 'react';
import { X, Flag } from 'lucide-react';
import CustomSelect from './CustomSelect';

/**
 * Reusable Report Modal
 * 
 * @param {boolean} isOpen - Whether the modal is visible.
 * @param {string} title - Modal title (e.g., 'Report Collection').
 * @param {string} type - 'collection' | 'comment' | 'review' | 'reply'.
 * @param {Array} options - List of { value, label } for the report reason.
 * @param {function} onSubmit - Callback when the report is submitted (passes { reason, details }).
 * @param {function} onClose - Callback when the modal is closed.
 * @param {boolean} isSubmitting - Whether the submission is in progress.
 */
const ReportModal = ({
    isOpen,
    title,
    type = 'content',
    options = [],
    onSubmit,
    onClose,
    isSubmitting = false
}) => {
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!reason) return;
        onSubmit({ reason, details });
    };

    const handleClose = () => {
        setReason('');
        setDetails('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[500] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-primary-navy border border-gray-700/50 rounded-xl max-w-lg w-full p-6 relative shadow-2xl animate-in fade-in zoom-in duration-200">
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    disabled={isSubmitting}
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                        <Flag size={20} className="text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">
                        {title || `Report ${type.charAt(0).toUpperCase() + type.slice(1)}`}
                    </h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Reason</label>
                        <CustomSelect
                            options={[
                                { value: '', label: 'Select a reason...' },
                                ...options
                            ]}
                            value={reason}
                            onChange={setReason}
                            containerClassName="w-full"
                            className="w-full bg-primary-navy-dark py-2.5"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Additional Details (Optional)</label>
                        <textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            placeholder="Provide any extra context..."
                            className="w-full bg-primary-navy-dark border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-yellow transition-colors min-h-[120px] resize-none"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 py-3 px-4 bg-gray-800/50 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors border border-gray-700/50 disabled:opacity-50"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !reason}
                            className="flex-[2] py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Sending Report...' : 'Submit Report'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReportModal;
