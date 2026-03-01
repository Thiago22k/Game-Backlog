import { useState, useEffect } from 'react';
import { Shield, Search, Filter, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import usePageTitle from '../../hooks/usePageTitle';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import ReportDetailModal from '../../components/moderation/ReportDetailModal';
import ConfirmModal from '../../components/common/ConfirmModal';
import UserManagementTab from '../../components/moderation/UserManagementTab';

const AdminDashboard = () => {
    usePageTitle('Admin Dashboard');

    const [activeTab, setActiveTab] = useState('reports'); // 'reports' or 'users'

    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, review, comment, profile, collection
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [selectedReport, setSelectedReport] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'default',
        isLoading: false
    });

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/moderation/reports');
            setReports(res.data);
        } catch (error) {
            toast.error('Failed to load pending reports');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, type, status) => {
        try {
            await axios.patch(`/moderation/reports/${type}/${id}/status`, { status });
            toast.success('Report status updated');
            fetchReports();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update report status');
        }
    };

    const handleTakeAction = (action, reportData) => {
        let title = 'Confirm Action';
        let message = `Are you sure you want to execute: ${action}? This cannot be undone.`;
        let variant = 'danger';

        if (action.includes('delete')) {
            title = 'Delete Content';
            message = 'Are you sure you want to delete this content? This action cannot be undone and will permanently remove the content from the platform.';
        } else if (action === 'ban_user') {
            title = 'Ban User';
            message = 'Are you sure you want to ban this user? They will lose access to their account and all their content will be hidden.';
        }

        setConfirmModal({
            isOpen: true,
            title,
            message,
            variant,
            isLoading: false,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }));
                try {
                    await axios.post(`/moderation/reports/${reportData.id}/action`, {
                        action,
                        reportData
                    });
                    toast.success(`Action '${action}' executed successfully.`);
                    setIsModalOpen(false);
                    fetchReports();
                } catch (error) {
                    console.error('Error taking action:', error);
                    toast.error(error.response?.data?.error || 'Failed to execute action');
                } finally {
                    setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
                }
            }
        });
    };

    const filteredReports = reports.filter(r => {
        const matchFilter = filter === 'all' || r.type === filter;
        const matchSearch = r.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.reporter_username?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchFilter && matchSearch;
    });

    return (
        <div className="min-h-screen bg-primary-navy flex flex-col">
            <Navbar />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-32">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Shield className="text-primary-yellow w-8 h-8" />
                        Moderation Dashboard
                    </h1>
                    <p className="text-gray-400 mt-2">Manage user reports and community guidelines</p>
                </div>

                <div className="flex border-b border-gray-700/50 mb-8">
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'reports'
                            ? 'border-primary-yellow text-primary-yellow'
                            : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                            }`}
                    >
                        Pending Reports
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'users'
                            ? 'border-primary-yellow text-primary-yellow'
                            : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                            }`}
                    >
                        User Management
                    </button>
                </div>

                {activeTab === 'reports' && (
                    <>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div className="flex bg-primary-navy-dark p-1 rounded-lg border border-gray-700/50">
                                {['all', 'review', 'comment', 'profile', 'collection', 'collection_comment'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filter === f
                                            ? 'bg-gray-800 text-white shadow'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                            }`}
                                    >
                                        {f.charAt(0).toUpperCase() + f.slice(1)} ({reports.filter(r => f === 'all' || r.type === f).length})
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-primary-navy-dark border border-gray-700/50 rounded-xl overflow-hidden shadow-xl">
                            <div className="p-4 border-b border-gray-700/50 flex items-center bg-gray-900/50">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search by reason or reporter..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full bg-primary-navy border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-yellow transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-gray-400">
                                    <thead className="text-xs uppercase bg-gray-800/50 text-gray-300 border-b border-gray-700/50">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Type</th>
                                            <th className="px-6 py-4 font-semibold">Reported Entity</th>
                                            <th className="px-6 py-4 font-semibold">Reporter</th>
                                            <th className="px-6 py-4 font-semibold">Reason</th>
                                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-12 text-center">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-yellow mb-4"></div>
                                                        <p className="text-gray-400">Loading reports...</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredReports.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-12 text-center">
                                                    <div className="flex flex-col items-center justify-center text-gray-500">
                                                        <CheckCircle className="w-12 h-12 mb-4 opacity-50" />
                                                        <p className="text-lg font-medium text-gray-300">All caught up!</p>
                                                        <p className="mt-1">No pending reports found for this filter.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredReports.map(report => (
                                                <tr key={`${report.type}-${report.id}`} className="border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors group cursor-pointer" onClick={() => { setSelectedReport(report); setIsModalOpen(true); }}>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${report.type === 'review' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                            report.type === 'comment' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                                                                report.type === 'collection_comment' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                                                                    report.type === 'profile' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                                        'bg-green-500/10 text-green-400 border-green-500/20'
                                                            }`}>
                                                            {report.type.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-white">
                                                        {report.type === 'review' && (
                                                            <div className="flex flex-col">
                                                                <span>Review by {report.reported_username}</span>
                                                                <span className="text-xs text-gray-500 font-normal truncate max-w-[200px]" title={report.review_content}>
                                                                    "{report.review_content}"
                                                                </span>
                                                            </div>
                                                        )}
                                                        {report.type === 'comment' && (
                                                            <div className="flex flex-col">
                                                                <span>Reply by {report.reported_username}</span>
                                                                <span className="text-xs text-gray-500 font-normal truncate max-w-[200px]" title={report.comment_content}>
                                                                    "{report.comment_content}"
                                                                </span>
                                                            </div>
                                                        )}
                                                        {report.type === 'profile' && <span>User: {report.reported_username}</span>}
                                                        {report.type === 'collection' && (
                                                            <div className="flex flex-col">
                                                                <span className="truncate max-w-[200px]" title={report.collection_title}>{report.collection_title}</span>
                                                                <span className="text-xs text-gray-500 font-normal">by {report.reported_username}</span>
                                                            </div>
                                                        )}
                                                        {report.type === 'collection_comment' && (
                                                            <div className="flex flex-col">
                                                                <span>Reply in {report.collection_title}</span>
                                                                <span className="text-xs text-gray-500 font-normal truncate max-w-[200px]" title={report.comment_content}>
                                                                    "{report.comment_content}"
                                                                </span>
                                                                <span className="text-xs text-gray-500 font-normal">by {report.reported_username}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-gray-300">{report.reporter_username}</span>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {new Date(report.created_at).toLocaleDateString()}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-red-400/90">{report.reason}</span>
                                                            {report.details && (
                                                                <span className="text-xs text-gray-400 mt-1 line-clamp-2" title={report.details}>
                                                                    {report.details}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => handleUpdateStatus(report.id, report.type, 'resolved')}
                                                                className="p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                                                                title="Mark as Resolved"
                                                            >
                                                                <CheckCircle className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateStatus(report.id, report.type, 'dismissed')}
                                                                className="p-1.5 bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 hover:text-white rounded-lg transition-colors"
                                                                title="Dismiss Report"
                                                            >
                                                                <XCircle className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'users' && (
                    <UserManagementTab />
                )}
            </main>

            <ReportDetailModal
                isOpen={isModalOpen}
                report={selectedReport}
                onClose={() => { setIsModalOpen(false); setSelectedReport(null); }}
                onUpdateStatus={(id, type, status) => {
                    handleUpdateStatus(id, type, status);
                    setIsModalOpen(false);
                }}
                onTakeAction={(action, reportData) => {
                    handleTakeAction(action, reportData);
                }}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
                isLoading={confirmModal.isLoading}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />

            <Footer />
        </div>
    );
};

export default AdminDashboard;
