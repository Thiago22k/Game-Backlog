import { X, ShieldAlert, CheckCircle, XCircle, Trash2, Ban, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const ReportDetailModal = ({ report, isOpen, onClose, onUpdateStatus, onTakeAction }) => {
    if (!isOpen || !report) return null;

    const renderReportDetails = () => {
        switch (report.type) {
            case 'review':
                return (
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 mb-6">
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Review Details</h4>
                        <div className="flex flex-col space-y-3 font-medium text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-gray-500 text-sm">Target: </span>
                                    Review by <Link to={`/profile/${report.reported_username}`} className="text-primary-yellow hover:underline" onClick={onClose}>{report.reported_username}</Link>
                                </div>
                                <Link
                                    to={report.game_slug ? `/game/${report.game_slug}` : `/profile/${report.reported_username}`}
                                    className="flex items-center text-xs text-gray-400 hover:text-white transition-colors"
                                    onClick={onClose}
                                >
                                    View Review <ExternalLink size={12} className="ml-1" />
                                </Link>
                            </div>
                            <div>
                                <span className="text-gray-500 text-sm">Review Content: </span>
                                <div className="p-3 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-300 font-normal italic mt-1 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                                    "{report.review_content}"
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'comment':
                return (
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 mb-6">
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Comment / Reply Details</h4>
                        <div className="flex flex-col space-y-3 font-medium text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-gray-500 text-sm">Target: </span>
                                    Reply by <Link to={`/profile/${report.reported_username}`} className="text-primary-yellow hover:underline" onClick={onClose}>{report.reported_username}</Link>
                                </div>
                                <Link
                                    to={report.game_slug ? `/game/${report.game_slug}` : `/profile/${report.reported_username}`}
                                    className="flex items-center text-xs text-gray-400 hover:text-white transition-colors"
                                    onClick={onClose}
                                >
                                    View Review <ExternalLink size={12} className="ml-1" />
                                </Link>
                            </div>
                            <div>
                                <span className="text-gray-500 text-sm">Comment Content: </span>
                                <div className="p-3 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-300 font-normal italic mt-1 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                                    "{report.comment_content}"
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'collection_comment':
                return (
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 mb-6 font-medium text-white">
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Collection Comment Details</h4>
                        <div className="flex flex-col space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-gray-500 text-sm">Collection: </span>
                                    <span className="text-gray-300">{report.collection_title}</span>
                                </div>
                                <Link
                                    to={`/collections/${report.collection_id}`}
                                    className="flex items-center text-xs text-gray-400 hover:text-white transition-colors"
                                    onClick={onClose}
                                >
                                    View Collection <ExternalLink size={12} className="ml-1" />
                                </Link>
                            </div>
                            <div>
                                <span className="text-gray-500 text-sm">Author: </span>
                                <Link to={`/profile/${report.reported_username}`} className="text-primary-yellow hover:underline" onClick={onClose}>{report.reported_username}</Link>
                            </div>
                            <div>
                                <span className="text-gray-500 text-sm">Comment: </span>
                                <div className="p-3 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-300 font-normal italic mt-1 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">
                                    "{report.comment_content}"
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'profile':
                return (
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 mb-6 font-medium text-white">
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Profile Details</h4>
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-gray-500 text-sm">User: </span>
                                <Link to={`/profile/${report.reported_username}`} className="text-primary-yellow hover:underline" onClick={onClose}>
                                    @{report.reported_username}
                                </Link>
                            </div>
                            <Link
                                to={`/profile/${report.reported_username}`}
                                className="flex items-center text-xs text-gray-400 hover:text-white transition-colors"
                                onClick={onClose}
                            >
                                View Profile <ExternalLink size={12} className="ml-1" />
                            </Link>
                        </div>
                    </div>
                );
            case 'collection':
                return (
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 mb-6 font-medium text-white flex flex-col space-y-3">
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Collection Details</h4>
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-gray-500 text-sm">Title: </span>
                                <Link to={`/collections/${report.collection_id}`} className="text-primary-yellow hover:underline" onClick={onClose}>
                                    {report.collection_title}
                                </Link>
                            </div>
                            <Link
                                to={`/collections/${report.collection_id}`}
                                className="flex items-center text-xs text-gray-400 hover:text-white transition-colors"
                                onClick={onClose}
                            >
                                View Collection <ExternalLink size={12} className="ml-1" />
                            </Link>
                        </div>
                        <div>
                            <span className="text-gray-500 text-sm">Creator: </span>
                            <Link to={`/profile/${report.reported_username}`} className="text-primary-yellow hover:underline" onClick={onClose}>
                                @{report.reported_username}
                            </Link>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-primary-navy-dark border border-gray-700 rounded-2xl p-6 md:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors bg-gray-800 p-1 rounded-full border border-gray-700"
                >
                    <X size={24} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <ShieldAlert className={`w-8 h-8 
                        ${report.type === 'review' ? 'text-blue-400' :
                            report.type === 'comment' ? 'text-cyan-400' :
                                report.type === 'collection_comment' ? 'text-teal-400' :
                                    report.type === 'profile' ? 'text-purple-400' : 'text-green-400'}`
                    } />
                    <div>
                        <h2 className="text-2xl font-bold text-white capitalize">{report.type} Report</h2>
                        <p className="text-sm text-gray-400">ID: {report.id} • Submitted {new Date(report.created_at).toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/30">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Reporter</h4>
                        <p className="text-white font-medium">@{report.reporter_username}</p>
                    </div>
                    <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/10">
                        <h4 className="text-sm font-semibold text-red-500/70 uppercase tracking-wider mb-2">Reason</h4>
                        <p className="text-red-400 font-medium">{report.reason}</p>
                    </div>
                </div>

                {report.details && (
                    <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/30 mb-6">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Additional Details</h4>
                        <p className="text-gray-300 leading-relaxed">{report.details}</p>
                    </div>
                )}

                {renderReportDetails()}

                <div className="border-t border-gray-800 pt-6 flex flex-col gap-4">
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Moderation Actions</h4>

                    {/* Status Updates */}
                    <div className="flex flex-wrap gap-3 mb-2">
                        <button
                            onClick={() => onUpdateStatus(report.id, report.type, 'resolved')}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg transition-colors font-medium text-sm"
                        >
                            <CheckCircle size={18} />
                            Mark as Resolved
                        </button>
                        <button
                            onClick={() => onUpdateStatus(report.id, report.type, 'dismissed')}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700/30 hover:bg-gray-700/60 text-gray-300 border border-gray-600/30 rounded-lg transition-colors font-medium text-sm"
                        >
                            <XCircle size={18} />
                            Dismiss Report
                        </button>
                    </div>

                    {/* Enforcement Actions */}
                    <div className="flex flex-wrap gap-3">
                        {report.type === 'review' && (
                            <button
                                onClick={() => onTakeAction('delete_review', report)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors font-medium text-sm"
                            >
                                <Trash2 size={18} />
                                Delete Review
                            </button>
                        )}
                        {report.type === 'comment' && (
                            <button
                                onClick={() => onTakeAction('delete_comment', report)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors font-medium text-sm"
                            >
                                <Trash2 size={18} />
                                Delete Comment
                            </button>
                        )}
                        {report.type === 'collection_comment' && (
                            <button
                                onClick={() => onTakeAction('delete_collection_comment', report)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors font-medium text-sm"
                            >
                                <Trash2 size={18} />
                                Delete Comment
                            </button>
                        )}
                        {report.type === 'collection' && (
                            <button
                                onClick={() => onTakeAction('delete_collection', report)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors font-medium text-sm"
                            >
                                <Trash2 size={18} />
                                Delete Collection
                            </button>
                        )}
                        <button
                            onClick={() => onTakeAction('ban_user', report)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600/10 hover:bg-red-600/30 text-red-500 border border-red-600/30 rounded-lg transition-colors font-medium text-sm"
                        >
                            <Ban size={18} />
                            Ban User
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportDetailModal;
