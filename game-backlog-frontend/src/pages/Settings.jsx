import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Mail,
  User as UserIcon,
  Lock,
  AlertTriangle,
  Calendar,
  X,
  FileText,
  Shield,
  Link2,
  ExternalLink,
  CheckCircle2,
  Eye,
  EyeOff,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';
import TwitchIcon from '../assets/twitch-icon.svg?react';
import DiscordIcon from '../assets/discord-icon.svg?react';
import SteamIcon from '../assets/steam-icon.svg?react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import usePageTitle from '../hooks/usePageTitle';
import SteamConnectionCard from '../components/settings/SteamConnectionCard';
import { sanitizeSocialHandle, sanitizeBio } from '../utils/sanitize';

const BIO_MAX_LENGTH = 40;

const NAV_SECTIONS = [
  { id: 'profile', label: 'Public Profile', icon: FileText },
  { id: 'account', label: 'Account & Security', icon: Shield },
  { id: 'connections', label: 'Connections', icon: Link2 },
  { id: 'privacy', label: 'Privacy & Danger', icon: AlertTriangle },
];

const Settings = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState('profile');

  // Modals
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [emailData, setEmailData] = useState({ newEmail: '', password: '' });
  const [usernameData, setUsernameData] = useState({ newUsername: '', password: '' });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [deleteData, setDeleteData] = useState({ password: '', confirmText: '' });

  // Profile data
  const [profileData, setProfileData] = useState({
    bio: user?.bio || '',
    social_twitch: user?.social_twitch || '',
    social_discord: user?.social_discord || '',
    social_steam: user?.social_steam || '',
  });

  const [loading, setLoading] = useState(false);
  const [isProfilePublic, setIsProfilePublic] = useState(user?.is_profile_public ?? true);

  usePageTitle('Settings');

  // Sincronizar si el objeto user llega después del primer render
  useEffect(() => {
    if (!user) return;
    setProfileData({
      bio: user.bio || '',
      social_twitch: user.social_twitch || '',
      social_discord: user.social_discord || '',
      social_steam: user.social_steam || '',
    });
    setIsProfilePublic(user.is_profile_public ?? true);
  }, [user]);

  // Cerrar cualquier modal abierto con Escape
  const anyModalOpen = showEmailModal || showUsernameModal || showPasswordModal || showDeleteModal;
  useEffect(() => {
    if (!anyModalOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowEmailModal(false);
        setShowUsernameModal(false);
        setShowPasswordModal(false);
        setShowDeleteModal(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [anyModalOpen]);

  // Handlers
  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    const nextEmail = emailData.newEmail.trim();
    if (!nextEmail) return;

    setLoading(true);
    try {
      await axios.put(ENDPOINTS.SETTINGS.UPDATE_EMAIL, {
        newEmail: nextEmail,
        password: emailData.password,
      });
      updateUser({ ...user, email: nextEmail });
      toast.success('Email updated successfully!');
      setShowEmailModal(false);
      setEmailData({ newEmail: '', password: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error updating email');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    const nextUsername = usernameData.newUsername.trim();
    if (!nextUsername) return;

    setLoading(true);
    try {
      await axios.put(ENDPOINTS.SETTINGS.UPDATE_USERNAME, {
        newUsername: nextUsername,
        password: usernameData.password,
      });
      updateUser({ ...user, username: nextUsername });
      toast.success('Username updated successfully!');
      setShowUsernameModal(false);
      setUsernameData({ newUsername: '', password: '' });
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
      const res = await axios.put(ENDPOINTS.SETTINGS.CHANGE_PASSWORD, {
        ...(user?.has_password ? { currentPassword: passwordData.currentPassword } : {}),
        newPassword: passwordData.newPassword,
      });
      toast.success(user?.has_password ? 'Password changed successfully!' : 'Password created successfully!');
      if (res.data?.has_password) {
        updateUser({ has_password: true });
      }
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
        data: { password: deleteData.password },
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

    const sanitizedData = {
      ...profileData,
      bio: sanitizeBio(profileData.bio),
      social_twitch: sanitizeSocialHandle(profileData.social_twitch, 25),
      social_discord: sanitizeSocialHandle(profileData.social_discord, 32),
      social_steam: sanitizeSocialHandle(profileData.social_steam, 32),
    };

    try {
      const res = await axios.put(ENDPOINTS.SETTINGS.UPDATE_PROFILE, sanitizedData);
      updateUser(res.data.user);

      setProfileData({
        bio: sanitizedData.bio || '',
        social_twitch: sanitizedData.social_twitch || '',
        social_discord: sanitizedData.social_discord || '',
        social_steam: sanitizedData.social_steam || '',
      });

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
      updateUser({ ...user, is_profile_public: newStatus });
      toast.success(newStatus ? 'Profile set to Public' : 'Profile set to Private');
    } catch {
      toast.error('Error updating privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const el = document.getElementById(`settings-${sectionId}`);
    if (el) {
      const yOffset = -110;
      const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  const avatarInitial = (user?.username || 'U').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-primary-navy">
      <Navbar />

      <main className="max-w-5xl mx-auto pt-28 sm:pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        {/* ── IDENTITY HEADER CARD ───────────────────────────────────────── */}
        <div className="bg-primary-navy-dark border border-white/5 rounded-2xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.username}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-primary-yellow/40 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary-yellow/15 border border-primary-yellow/30 flex items-center justify-center text-primary-yellow text-2xl sm:text-3xl font-black shrink-0">
                {avatarInitial}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-white truncate">
                  {user?.username || 'Player'}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${isProfilePublic
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                >
                  {isProfilePublic ? <Eye size={11} /> : <EyeOff size={11} />}
                  {isProfilePublic ? 'Public' : 'Private'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-400 mt-1.5">
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-gray-500" />
                  Member since {memberSince}
                </span>
                {user?.email && (
                  <>
                    <span className="text-gray-600">·</span>
                    <span className="truncate">{user.email}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {user?.username && (
            <Link
              to={`/profile/${user.username}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold text-white hover:text-primary-yellow transition-all shrink-0"
            >
              <span>View Public Profile</span>
              <ExternalLink size={15} />
            </Link>
          )}
        </div>

        {/* ── 2-COLUMN SETTINGS LAYOUT ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sticky Sidebar Nav */}
          <aside className="lg:col-span-3 lg:sticky lg:top-28">
            <nav className="flex lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0 custom-scrollbar">
              {NAV_SECTIONS.map(({ id, label, icon: Icon }) => {
                const isActive = activeSection === id;
                const isDanger = id === 'privacy';
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => scrollToSection(id)}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all text-left ${isActive
                      ? 'bg-primary-navy-dark text-primary-yellow border border-primary-yellow/30 shadow-sm'
                      : isDanger
                        ? 'text-gray-400 hover:text-red-400 hover:bg-white/[0.03]'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
                      }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content Sections */}
          <div className="lg:col-span-9 space-y-8">
            {/* 1. PUBLIC PROFILE */}
            <section
              id="settings-profile"
              className="bg-primary-navy-dark border border-white/5 rounded-2xl p-6 sm:p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-primary-yellow/10 rounded-xl">
                  <FileText className="text-primary-yellow" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Public Profile</h2>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Customize your bio and gaming handles shown on your profile
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Short Bio
                    </label>
                    <span
                      className={`text-xs font-semibold ${profileData.bio.length >= BIO_MAX_LENGTH - 5 ? 'text-amber-400' : 'text-gray-500'
                        }`}
                    >
                      {profileData.bio.length}/{BIO_MAX_LENGTH}
                    </span>
                  </div>
                  <textarea
                    maxLength={BIO_MAX_LENGTH}
                    rows={2}
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    placeholder="Soulslike enthusiast, achievement hunter..."
                    className="w-full bg-primary-navy border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-primary-yellow resize-none text-sm placeholder-gray-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                    Social & Gaming Handles
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="bg-primary-navy border border-white/10 focus-within:border-purple-400/60 rounded-xl px-3.5 py-2.5 transition-colors">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-400 mb-1">
                        <TwitchIcon className="w-3.5 h-3.5 fill-current" /> Twitch
                      </label>
                      <input
                        type="text"
                        maxLength={25}
                        value={profileData.social_twitch}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            social_twitch: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 25),
                          })
                        }
                        placeholder="username"
                        className="w-full bg-transparent text-white focus:outline-none text-sm placeholder-gray-600"
                      />
                    </div>

                    <div className="bg-primary-navy border border-white/10 focus-within:border-indigo-400/60 rounded-xl px-3.5 py-2.5 transition-colors">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-1">
                        <DiscordIcon className="w-3.5 h-3.5 fill-current" /> Discord
                      </label>
                      <input
                        type="text"
                        maxLength={32}
                        value={profileData.social_discord}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            social_discord: e.target.value.replace(/[^a-zA-Z0-9_.#]/g, '').slice(0, 32),
                          })
                        }
                        placeholder="username"
                        className="w-full bg-transparent text-white focus:outline-none text-sm placeholder-gray-600"
                      />
                    </div>

                    <div className="bg-primary-navy border border-white/10 focus-within:border-[#00adee]/60 rounded-xl px-3.5 py-2.5 transition-colors">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#00adee] mb-1">
                        <SteamIcon className="w-3.5 h-3.5 fill-current" /> Steam
                      </label>
                      <input
                        type="text"
                        maxLength={32}
                        value={profileData.social_steam}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            social_steam: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32),
                          })
                        }
                        placeholder="custom id"
                        className="w-full bg-transparent text-white focus:outline-none text-sm placeholder-gray-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 bg-primary-yellow hover:opacity-90 text-primary-navy-dark px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    {loading ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </section>

            {/* 2. ACCOUNT & SECURITY */}
            <section
              id="settings-account"
              className="bg-primary-navy-dark border border-white/5 rounded-2xl p-6 sm:p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-primary-yellow/10 rounded-xl">
                  <Shield className="text-primary-yellow" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Account & Security</h2>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Manage your credentials and sign-in methods
                  </p>
                </div>
              </div>

              <div className="divide-y divide-white/5 border border-white/5 rounded-xl bg-primary-navy/60 overflow-hidden">
                {/* Username Row */}
                <div className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-2 rounded-lg bg-white/5 text-gray-300 shrink-0">
                      <UserIcon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Username</p>
                      <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUsernameModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors shrink-0"
                  >
                    <span>Change</span>
                    <ChevronRight size={14} className="text-gray-400" />
                  </button>
                </div>

                {/* Email Row */}
                <div className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-2 rounded-lg bg-white/5 text-gray-300 shrink-0">
                      <Mail size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Email Address</p>
                      <p className="text-sm font-semibold text-white truncate">
                        {user?.email || <span className="text-gray-500 font-normal">No email linked</span>}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors shrink-0"
                  >
                    <span>{user?.email ? 'Update' : 'Add Email'}</span>
                    <ChevronRight size={14} className="text-gray-400" />
                  </button>
                </div>

                {/* Password Row */}
                <div className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-2 rounded-lg bg-white/5 text-gray-300 shrink-0">
                      <Lock size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Password</p>
                      <p className="text-sm text-gray-300">
                        {user?.has_password
                          ? '••••••••••••'
                          : 'No password set (Steam sign-in only)'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-yellow/15 hover:bg-primary-yellow/25 border border-primary-yellow/30 text-xs font-bold text-primary-yellow transition-colors shrink-0"
                  >
                    <span>{user?.has_password ? 'Change Password' : 'Set Password'}</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </section>

            {/* 3. CONNECTED ACCOUNTS */}
            <section id="settings-connections">
              <SteamConnectionCard />
            </section>

            {/* 4. PRIVACY & DANGER ZONE */}
            <section id="settings-privacy" className="space-y-6">
              {/* Privacy */}
              <div className="bg-primary-navy-dark border border-white/5 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-white/5 rounded-xl text-gray-300 shrink-0 mt-0.5">
                    {isProfilePublic ? <Eye size={20} /> : <EyeOff size={20} />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Profile Visibility</h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                      {isProfilePublic
                        ? 'Your library, stats, and collections are visible to other Stackd users.'
                        : 'Your profile is hidden. Only you can see your library and activity.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTogglePrivacy}
                  disabled={loading}
                  aria-label="Toggle Profile Privacy"
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none ${isProfilePublic ? 'bg-primary-yellow' : 'bg-gray-700'
                    }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${isProfilePublic ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-red-500/15 rounded-xl text-red-400 shrink-0 mt-0.5">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Delete Account</h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                      Permanently remove your account, tracked games, reviews, and collections. This cannot be undone.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500 border border-red-500/40 text-red-300 hover:text-white text-xs font-bold transition-all shrink-0"
                >
                  Delete Account
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* ── MODALS ─────────────────────────────────────────────────────── */}
        {/* Email Modal */}
        {showEmailModal && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowEmailModal(false)}
          >
            <div
              className="bg-primary-navy-dark border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">
                  {user?.email ? 'Update Email Address' : 'Add Email Address'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    New Email
                  </label>
                  <input
                    type="email"
                    required
                    value={emailData.newEmail}
                    onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                    className="w-full bg-primary-navy border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-yellow"
                  />
                </div>

                {user?.has_password && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      value={emailData.password}
                      onChange={(e) => setEmailData({ ...emailData, password: e.target.value })}
                      className="w-full bg-primary-navy border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-yellow"
                    />
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary-yellow hover:opacity-90 text-primary-navy-dark py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
                  >
                    {loading ? 'Updating...' : 'Save Email'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Username Modal */}
        {showUsernameModal && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowUsernameModal(false)}
          >
            <div
              className="bg-primary-navy-dark border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">Change Username</h3>
                <button
                  type="button"
                  onClick={() => setShowUsernameModal(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateUsername} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    New Username
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={usernameData.newUsername}
                    onChange={(e) => setUsernameData({ ...usernameData, newUsername: e.target.value })}
                    className="w-full bg-primary-navy border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-yellow"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    Max 15 characters. Can only be changed once every 30 days.
                  </p>
                </div>

                {user?.has_password && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      value={usernameData.password}
                      onChange={(e) => setUsernameData({ ...usernameData, password: e.target.value })}
                      className="w-full bg-primary-navy border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-yellow"
                    />
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUsernameModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary-yellow hover:opacity-90 text-primary-navy-dark py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
                  >
                    {loading ? 'Updating...' : 'Save Username'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Modal */}
        {showPasswordModal && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowPasswordModal(false)}
          >
            <div
              className="bg-primary-navy-dark border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">
                  {user?.has_password ? 'Change Password' : 'Set Password'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                {user?.has_password && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full bg-primary-navy border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-yellow"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full bg-primary-navy border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-yellow"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full bg-primary-navy border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary-yellow"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary-yellow hover:opacity-90 text-primary-navy-dark py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
                  >
                    {loading ? 'Saving...' : 'Save Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <div
              className="bg-primary-navy-dark border border-red-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Delete Account</h3>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-3.5 mb-4">
                <p className="text-red-300 text-xs sm:text-sm font-medium">
                  This action is permanent. All your tracked games, reviews, collections, and Steam sync data will be erased.
                </p>
              </div>

              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Type <span className="text-red-400">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    required
                    value={deleteData.confirmText}
                    onChange={(e) => setDeleteData({ ...deleteData, confirmText: e.target.value })}
                    className="w-full bg-primary-navy border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500"
                    placeholder="DELETE"
                  />
                </div>

                {user?.has_password && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      value={deleteData.password}
                      onChange={(e) => setDeleteData({ ...deleteData, password: e.target.value })}
                      className="w-full bg-primary-navy border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Deleting...' : 'Delete Permanently'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Settings;