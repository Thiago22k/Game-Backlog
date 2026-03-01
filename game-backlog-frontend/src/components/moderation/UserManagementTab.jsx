import React, { useState, useEffect } from 'react';
import { Search, UserCog, Ban, CheckCircle, Shield, AlertTriangle } from 'lucide-react';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import ConfirmModal from '../common/ConfirmModal';
import { getAvatarUrl } from '../../utils/avatar';

const UserManagementTab = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // 'all', 'admin', 'user', 'banned'
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        variant: 'default',
        isLoading: false,
        onConfirm: () => { }
    });

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            fetchUsers();
        }, 500);
        return () => clearTimeout(debounceTimer);
    }, [searchTerm, filter]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (searchTerm) queryParams.append('q', searchTerm);

            const res = await axios.get(`/moderation/users/search?${queryParams.toString()}`);
            let fetchedUsers = res.data;

            // Apply frontend filter
            if (filter !== 'all') {
                if (filter === 'banned') {
                    fetchedUsers = fetchedUsers.filter(u => u.status === 'banned');
                } else {
                    fetchedUsers = fetchedUsers.filter(u => u.role === filter);
                }
            }

            setUsers(fetchedUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (userId, actionType, currentValue) => {
        let title, message, variant, updatedValue, endpoint;

        if (actionType === 'role') {
            const isDemoting = currentValue === 'admin';
            updatedValue = isDemoting ? 'user' : 'admin';
            title = isDemoting ? 'Demote Admin' : 'Promote to Admin';
            message = isDemoting
                ? `Are you sure you want to demote this user to a regular 'user'? They will lose access to the Moderation Dashboard.`
                : `Are you sure you want to promote this user to 'admin'? They will gain access to the Moderation Dashboard and all admin privileges.`;
            variant = isDemoting ? 'warning' : 'default';
            endpoint = `/moderation/users/${userId}/role`;
        } else if (actionType === 'ban') {
            const isUnbanning = currentValue === 'banned';
            updatedValue = isUnbanning ? 'active' : 'banned';
            title = isUnbanning ? 'Unban User' : 'Ban User';
            message = isUnbanning
                ? `Are you sure you want to unban this user? They will regain access to their account.`
                : `Are you sure you want to ban this user? They will lose access to their account and their content will be hidden.`;
            variant = isUnbanning ? 'success' : 'danger';
            endpoint = `/moderation/users/${userId}/status`;
        } else {
            return;
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
                    const payload = actionType === 'role' ? { role: updatedValue } : { status: updatedValue };
                    await axios.patch(endpoint, payload);
                    toast.success(`User ${actionType === 'role' ? 'role' : 'ban status'} updated successfully.`);
                    fetchUsers(); // Refresh the list
                } catch (error) {
                    console.error(`Error updating user ${actionType}:`, error);
                    toast.error(error.response?.data?.error || `Failed to update user ${actionType}`);
                } finally {
                    setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex bg-primary-navy-dark p-1 rounded-lg border border-gray-700/50">
                    {['all', 'admin', 'user', 'banned'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filter === f
                                ? 'bg-gray-800 text-white shadow'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search users by username or email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-primary-navy-dark border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-yellow transition-colors shadow-lg"
                    />
                </div>
            </div>

            <div className="bg-primary-navy-dark border border-gray-700/50 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="text-xs uppercase bg-gray-800/50 text-gray-300 border-b border-gray-700/50">
                            <tr>
                                <th className="px-6 py-4 font-semibold">User</th>
                                <th className="px-6 py-4 font-semibold">Role</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && users.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-yellow mb-4"></div>
                                            <p className="text-gray-400">Searching users...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                            <UserCog className="w-12 h-12 mb-4 opacity-50" />
                                            <p className="text-lg font-medium text-gray-300">No users found</p>
                                            <p className="mt-1 text-sm">Try adjusting your search or filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user.id} className="border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {getAvatarUrl(user) ? (
                                                    <img
                                                        src={getAvatarUrl(user)}
                                                        alt={user.username}
                                                        className="w-10 h-10 rounded-full object-cover border border-gray-700"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                                                        <span className="text-gray-400 font-medium text-sm">
                                                            {user.username.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-medium text-white">{user.username}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${user.role === 'admin'
                                                ? 'bg-primary-yellow/10 text-primary-yellow border-primary-yellow/20'
                                                : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                                }`}>
                                                {user.role === 'admin' && <Shield className="w-3.5 h-3.5" />}
                                                {user.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${user.status === 'banned'
                                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                : 'bg-green-500/10 text-green-400 border-green-500/20'
                                                }`}>
                                                {user.status === 'banned' ? (
                                                    <>
                                                        <Ban className="w-3.5 h-3.5" /> BANNED
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="w-3.5 h-3.5" /> ACTIVE
                                                    </>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2 relative">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleAction(user.id, 'role', user.role)}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${user.role === 'admin'
                                                        ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-orange-500/20'
                                                        : 'bg-primary-yellow/10 text-primary-yellow hover:bg-primary-yellow/20 border-primary-yellow/20'
                                                        }`}
                                                >
                                                    {user.role === 'admin' ? 'Demote' : 'Promote'}
                                                </button>

                                                <button
                                                    onClick={() => handleAction(user.id, 'ban', user.status)}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border flex items-center gap-1 ${user.status === 'banned'
                                                        ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20'
                                                        : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20'
                                                        }`}
                                                >
                                                    {user.status === 'banned' ? 'Unban' : <><Ban className="w-3.5 h-3.5" /> Ban</>}
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

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
                isLoading={confirmModal.isLoading}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};

export default UserManagementTab;
