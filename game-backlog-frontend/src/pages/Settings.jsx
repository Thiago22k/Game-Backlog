import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, User as UserIcon, Lock, AlertTriangle, Calendar, X, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';
import TwitchIcon from '../assets/twitch-icon.svg?react';
import DiscordIcon from '../assets/discord-icon.svg?react';
import SteamIcon from '../assets/steam-icon.svg?react';
import Navbar from '../components/layout/Navbar';
import usePageTitle from '../hooks/usePageTitle';

const Settings = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  // Estados para modals
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Datos de formularios
  const [emailData, setEmailData] = useState({ newEmail: '', password: '' });
  const [usernameData, setUsernameData] = useState({ newUsername: '', password: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [deleteData, setDeleteData] = useState({ password: '', confirmText: '' });

  // Profile data (bio + social links)
  const [profileData, setProfileData] = useState({
    bio: user?.bio || '',
    social_twitch: user?.social_twitch || '',
    social_discord: user?.social_discord || '',
    social_steam: user?.social_steam || '',
  });

  // Loading states
  const [loading, setLoading] = useState(false);

  usePageTitle('Settings');

  // Profile Privacy State
  const [isProfilePublic, setIsProfilePublic] = useState(user?.is_profile_public ?? true);

  // Handlers
  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.put(ENDPOINTS.SETTINGS.UPDATE_EMAIL, emailData);
      toast.success('Email updated successfully!');
      setShowEmailModal(false);
      setEmailData({ newEmail: '', password: '' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error updating email');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.put(ENDPOINTS.SETTINGS.UPDATE_USERNAME, usernameData);
      toast.success('Username updated successfully!');
      setShowUsernameModal(false);
      setUsernameData({ newUsername: '', password: '' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error updating username');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await axios.put(ENDPOINTS.SETTINGS.CHANGE_PASSWORD, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error changing password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();

    if (deleteData.confirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setLoading(true);

    try {
      await axios.delete(ENDPOINTS.SETTINGS.DELETE_ACCOUNT, {
        data: { password: deleteData.password }
      });
      toast.success('Account deleted successfully');
      logout();
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error deleting account');
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.put(ENDPOINTS.SETTINGS.UPDATE_PROFILE, profileData);
      updateUser(res.data.user);
      toast.success('Profile updated!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePrivacy = async () => {
    setLoading(true);
    try {
      const newStatus = !isProfilePublic;
      await axios.put(ENDPOINTS.SETTINGS.UPDATE_PROFILE_VISIBILITY, { isPublic: newStatus });
      setIsProfilePublic(newStatus);
      toast.success(newStatus ? 'Profile set to Public' : 'Profile set to Private');
    } catch (error) {
      toast.error('Error updating privacy settings');
    } finally {
      setLoading(false);
    }
  };

  // Calcular fecha de miembro
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  return (
    <div className="min-h-screen bg-primary-navy">
      <Navbar />

      <main className="max-w-4xl mx-auto pt-32 pb-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account preferences</p>
        </div>

        {/* Account Info Stats */}
        <div className="mb-8 bg-primary-navy-dark rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="text-primary-yellow" size={20} />
            <h2 className="text-lg font-semibold text-white">Account Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Member since</span>
              <p className="text-white font-medium">{memberSince}</p>
            </div>
            <div>
              <span className="text-gray-400">Username</span>
              <p className="text-white font-medium">{user?.username}</p>
            </div>
            <div>
              <span className="text-gray-400">Email</span>
              <p className="text-white font-medium">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Profile Card — Bio & Social Links */}
        <div className="mb-8 bg-primary-navy-dark rounded-lg p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <FileText className="text-green-400" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Public Profile</h3>
              <p className="text-sm text-gray-400">Bio and gaming social links shown on your profile</p>
            </div>
          </div>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {/* Bio */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-400">Bio</label>
                <span className={`text-xs ${profileData.bio.length > 190 ? 'text-red-400' : 'text-gray-500'}`}>
                  {profileData.bio.length}/200
                </span>
              </div>
              <textarea
                maxLength={200}
                rows={3}
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                placeholder="Tell other gamers a bit about yourself..."
                className="w-full bg-primary-navy border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-primary-yellow resize-none text-sm"
              />
            </div>
            {/* Social Links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-purple-400 mb-2">
                  <TwitchIcon className="w-4 h-4 fill-current" /> Twitch
                </label>
                <input
                  type="text"
                  value={profileData.social_twitch}
                  onChange={(e) => setProfileData({ ...profileData, social_twitch: e.target.value })}
                  placeholder="username"
                  className="w-full bg-primary-navy border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-primary-yellow text-sm"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-indigo-400 mb-2">
                  <DiscordIcon className="w-4 h-4 fill-current" /> Discord
                </label>
                <input
                  type="text"
                  value={profileData.social_discord}
                  onChange={(e) => setProfileData({ ...profileData, social_discord: e.target.value })}
                  placeholder="username"
                  className="w-full bg-primary-navy border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-primary-yellow text-sm"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-blue-400 mb-2">
                  <SteamIcon className="w-4 h-4 fill-current" /> Steam
                </label>
                <input
                  type="text"
                  value={profileData.social_steam}
                  onChange={(e) => setProfileData({ ...profileData, social_steam: e.target.value })}
                  placeholder="username"
                  className="w-full bg-primary-navy border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-primary-yellow text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Settings Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Email Card */}
          <div className="bg-primary-navy-dark rounded-lg p-6 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Mail className="text-blue-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Email Address</h3>
                <p className="text-sm text-gray-400">Change your email</p>
              </div>
            </div>
            <p className="text-gray-300 mb-4">{user?.email}</p>
            <button
              onClick={() => setShowEmailModal(true)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Change Email
            </button>
          </div>

          {/* Username Card */}
          <div className="bg-primary-navy-dark rounded-lg p-6 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-cyan-500/20 rounded-lg">
                <UserIcon className="text-cyan-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Username</h3>
                <p className="text-sm text-gray-400">Change your username</p>
              </div>
            </div>
            <p className="text-gray-300 mb-4">{user?.username}</p>
            <button
              onClick={() => setShowUsernameModal(true)}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Change Username
            </button>
          </div>
        </div>

        {/* Third Row: Privacy and Password */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Privacy Card */}
          <div className="bg-primary-navy-dark rounded-lg p-6 transition-colors flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Lock className="text-purple-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Profile Privacy</h3>
                <p className="text-sm text-gray-400">Control who can see your profile</p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-primary-navy p-4 rounded-lg mt-auto">
              <span className="text-sm text-gray-300">
                {isProfilePublic ? 'Public Profile (Visible to everyone)' : 'Private Profile (Only visible to you)'}
              </span>
              <button
                onClick={handleTogglePrivacy}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isProfilePublic ? 'bg-primary-yellow' : 'bg-gray-600'
                  }`}
              >
                <span className="sr-only">Toggle Profile Privacy</span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isProfilePublic ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>
          </div>

          {/* Password Card (Changed from full width to half size inside the grid above) */}
          <div className="bg-primary-navy-dark rounded-lg p-6 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary-yellow/20 rounded-lg">
                  <Lock className="text-primary-yellow" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Password</h3>
                  <p className="text-sm text-gray-400">Update your password regularly</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-4 mt-auto">••••••••••••</p>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full bg-primary-yellow hover:opacity-90 text-primary-navy-dark px-6 py-2 rounded-lg font-semibold transition-all mt-auto"
            >
              Change Password
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-500/10 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-500/20 rounded-lg">
              <AlertTriangle className="text-red-400" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Danger Zone</h3>
              <p className="text-sm text-gray-400">Permanently delete your account</p>
            </div>
          </div>
          <p className="text-gray-300 text-sm mb-4">
            Once you delete your account, there is no going back. All your data will be permanently removed.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Delete Account
          </button>
        </div>

        {/* Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-primary-navy-dark border border-gray-700 rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Change Email</h3>
                <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">New Email</label>
                  <input
                    type="email"
                    required
                    value={emailData.newEmail}
                    onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                    className="w-full bg-primary-navy border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-primary-yellow"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={emailData.password}
                    onChange={(e) => setEmailData({ ...emailData, password: e.target.value })}
                    className="w-full bg-primary-navy border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-primary-yellow"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Updating...' : 'Update Email'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Username Modal */}
        {showUsernameModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-primary-navy-dark border border-gray-700 rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Change Username</h3>
                <button onClick={() => setShowUsernameModal(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateUsername} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">New Username</label>
                  <input
                    type="text"
                    required
                    value={usernameData.newUsername}
                    onChange={(e) => setUsernameData({ ...usernameData, newUsername: e.target.value })}
                    className="w-full bg-primary-navy border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-primary-yellow"
                  />
                  <p className="text-xs text-gray-500 mt-1">Can only be changed once every 30 days</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={usernameData.password}
                    onChange={(e) => setUsernameData({ ...usernameData, password: e.target.value })}
                    className="w-full bg-primary-navy border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-primary-yellow"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Updating...' : 'Update Username'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-primary-navy-dark border border-gray-700 rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Change Password</h3>
                <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Current Password</label>
                  <input
                    type="password"
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full bg-primary-navy border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-primary-yellow"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full bg-primary-navy border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-primary-yellow"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full bg-primary-navy border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-primary-yellow"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-yellow hover:opacity-90 text-primary-navy-dark px-4 py-2 rounded-lg font-semibold disabled:opacity-50 transition-all"
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-primary-navy-dark border border-red-500 rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Delete Account</h3>
                <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                <p className="text-red-400 text-sm font-medium">
                  ⚠️ This action cannot be undone. All your data will be permanently deleted.
                </p>
              </div>

              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Type <span className="text-red-400 font-bold">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    required
                    value={deleteData.confirmText}
                    onChange={(e) => setDeleteData({ ...deleteData, confirmText: e.target.value })}
                    className="w-full bg-primary-navy border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
                    placeholder="DELETE"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={deleteData.password}
                    onChange={(e) => setDeleteData({ ...deleteData, password: e.target.value })}
                    className="w-full bg-primary-navy border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Deleting...' : 'Delete Account Permanently'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Settings;