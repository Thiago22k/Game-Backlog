import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X, User, LogOut, Bell } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import Logo from '../../assets/isotipo.svg?react';
import SearchModal from './SearchModal';
import { getAvatarUrl } from '../../utils/avatar';

// ─── Helper: format relative time ────────────────────────────────────────────
const relativeTime = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ─── Helper: notification message ────────────────────────────────────────────
const notifMessage = (notif) => {
  const actor = notif.actor_username || notif.metadata?.actor_username || 'Someone';
  const colName = notif.metadata?.collection_name || 'your collection';
  const gameName = notif.metadata?.game_name || notif.metadata?.gameName || 'a game';

  if (notif.type === 'LIKED_COLLECTION') {
    return <><span className="font-semibold text-white">@{actor}</span>{' liked your collection '}<span className="italic">«{colName}»</span></>;
  }
  if (notif.type === 'COMMENTED_COLLECTION') {
    const preview = notif.metadata?.comment_preview;
    return <><span className="font-semibold text-white">@{actor}</span>{' commented on '}<span className="italic">«{colName}»</span>{preview ? <><br /><span className="text-gray-500 text-xs">"{preview}"</span></> : null}</>;
  }
  if (notif.type === 'like_review') {
    return <><span className="font-semibold text-white">@{actor}</span>{' liked your review for '}<span className="italic">«{gameName}»</span></>;
  }
  if (notif.type === 'comment_review') {
    return <><span className="font-semibold text-white">@{actor}</span>{' commented on your review for '}<span className="italic">«{gameName}»</span></>;
  }
  if (notif.type === 'NEW_FOLLOWER') {
    return <><span className="font-semibold text-white">@{actor}</span>{' started following you'}</>;
  }
  return 'New notification';
};

// ─── Single notification row ──────────────────────────────────────────────────
const NotifItem = ({ notif, onRead }) => (
  <button
    onClick={onRead}
    className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-primary-navy transition-colors border-b border-gray-800 last:border-0 ${!notif.is_read ? 'bg-primary-navy/40' : ''}`}
  >
    <img
      src={getAvatarUrl({
        avatar_url: notif.actor_avatar_url,
        avatar_static_url: notif.actor_avatar_static_url
      }, { animated: false })}
      alt={notif.actor_username}
      className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
    />
    <div className="flex-1 min-w-0">
      <p className="text-gray-300 text-xs leading-snug">{notifMessage(notif)}</p>
      <p className="text-gray-600 text-[11px] mt-1">{relativeTime(notif.created_at)}</p>
    </div>
    {!notif.is_read && <span className="w-2 h-2 rounded-full bg-primary-yellow flex-shrink-0 mt-1.5" />}
  </button>
);

const Navbar = ({ transparentMode = true }) => {

  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const { notifications, unreadCount, markAllRead, markOneRead } = useNotifications();

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifPanelOpen(false);
      }
    };

    if (profileDropdownOpen || notifPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen, notifPanelOpen]);

  // Detectar si estamos en páginas de autenticación
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setProfileDropdownOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <div className={`${transparentMode ? 'absolute top-0 left-0 w-full z-[200]' : 'relative w-full mb-8 z-[200]'} flex justify-center`}>
        {!transparentMode && <div className="absolute top-0 left-0 w-full h-12 bg-primary-navy-dark z-0 shadow-sm"></div>}
        <nav className={`relative z-10 rounded-b-[2.5rem] rounded-t-none mx-auto mt-0 shadow-lg w-full max-w-3xl ${transparentMode ? 'bg-primary-navy-dark/70 backdrop-blur-md border border-gray-700/50' : 'bg-primary-navy-dark'}`}>
          <div className="px-8">
            <div className="flex justify-between items-center h-20">

              {/* Mobile: Logo + Hamburger */}
              <div className="flex items-center lg:hidden w-full justify-between">
                <Link to="/" className="flex items-center">
                  <Logo className="h-5 w-auto text-white" />
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="text-white p-2"
                >
                  {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
              </div>

              {/* Desktop: Full navbar */}
              <div className="hidden lg:flex items-center justify-between w-full">

                {/* Left: Links */}
                <div className="flex items-center space-x-8">
                  <Link
                    to="/explore"
                    className={`text-white text-base font-medium pb-1 transition-all ${isActive('/explore') ? 'border-b-2 border-white' : 'hover:text-gray-300'
                      }`}
                  >
                    Explore
                  </Link>
                  <Link
                    to="/collections"
                    className={`text-white text-base font-medium pb-1 transition-all ${isActive('/collections') ? 'border-b-2 border-white' : 'hover:text-gray-300'
                      }`}
                  >
                    Collections
                  </Link>
                </div>

                {/* Center: Logo */}
                <Link to="/" className="flex items-center absolute left-1/2 transform -translate-x-1/2">
                  <Logo className="h-8 w-auto text-white" /><span className="text-white text-2xl font-bold px-2 pb-1 transition-all">Stackd</span>
                </Link>

                {/* Right: Search + Auth */}
                <div className="flex items-center space-x-3">
                  {/* Search button - OCULTO en páginas de auth */}
                  {!isAuthPage && (
                    <button
                      onClick={() => setSearchModalOpen(true)}
                      className="flex items-center space-x-2 bg-white bg-opacity-10 hover:bg-opacity-20 text-white px-4 py-2 rounded-lg transition-all text-sm"
                    >
                      <span>Search</span>
                      <Search size={18} />
                    </button>
                  )}

                  {/* Bell notification icon — only for logged-in users */}
                  {isAuthenticated && !isAuthPage && (
                    <div className="relative" ref={notifRef}>
                      <button
                        onClick={() => setNotifPanelOpen(prev => !prev)}
                        className="relative text-white hover:text-gray-300 transition-colors p-1"
                        aria-label="Notifications"
                      >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </button>

                      {notifPanelOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-primary-navy-dark border border-gray-700 rounded-xl shadow-2xl z-[200] flex flex-col max-h-[460px]">
                          {/* Header */}
                          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                            <span className="text-white font-semibold text-sm">Notifications</span>
                            {unreadCount > 0 && (
                              <button
                                onClick={markAllRead}
                                className="text-xs text-primary-yellow hover:opacity-80 transition"
                              >
                                Mark all read
                              </button>
                            )}
                          </div>

                          {/* List */}
                          <div className="overflow-y-auto flex-1 border-b border-gray-700 custom-scrollbar">
                            {notifications.length === 0 ? (
                              <div className="px-4 py-8 text-center text-gray-500 text-sm">No notifications yet</div>
                            ) : (
                              notifications.map(notif => (
                                <NotifItem
                                  key={notif.id}
                                  notif={notif}
                                  onRead={() => {
                                    markOneRead(notif.id);
                                    if (notif.type === 'NEW_FOLLOWER') {
                                      navigate(`/profile/${notif.actor_username}`);
                                    } else {
                                      const isCollection = notif.type.includes('COLLECTION');
                                      const target = isCollection
                                        ? `/collections/${notif.entity_id}`
                                        : `/game/${notif.metadata?.game_slug || notif.metadata?.gameId}`;
                                      navigate(target);
                                    }
                                    setNotifPanelOpen(false);
                                  }}
                                />
                              ))
                            )}
                          </div>

                          {/* Footer Link */}
                          <Link
                            to="/notifications"
                            className="block text-center py-2.5 text-sm text-primary-yellow hover:bg-white/5 transition-colors rounded-b-xl"
                            onClick={() => setNotifPanelOpen(false)}
                          >
                            View all notifications
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {isAuthenticated ? (
                    /* Profile dropdown */
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                        className="flex items-center space-x-2 text-white hover:text-gray-300 transition-all"
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-gray-600 bg-primary-navy-dark">
                          <img
                            src={getAvatarUrl(user, { animated: false })}
                            alt={user?.username || 'User'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </button>

                      {profileDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-primary-navy-dark border border-gray-700 rounded-lg shadow-lg py-2 z-[200]">
                          <Link
                            to={user ? `/profile/${user.username}` : '/profile'}
                            className="block px-4 py-2 text-sm text-white hover:bg-primary-navy hover:text-primary-yellow transition-colors"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            My Profile
                          </Link>
                          <Link
                            to="/settings"
                            className="block px-4 py-2 text-sm text-white hover:bg-primary-navy hover:text-primary-yellow transition-colors"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            Settings
                          </Link>
                          {user?.role === 'admin' && (
                            <Link
                              to="/admin"
                              className="block px-4 py-2 text-sm text-primary-yellow hover:bg-primary-navy hover:text-white transition-colors border-t border-gray-700 mt-2 pt-2"
                              onClick={() => setProfileDropdownOpen(false)}
                            >
                              Admin Panel
                            </Link>
                          )}
                          <hr className="my-2 border-gray-700" />
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-primary-navy hover:text-red-300 transition-colors flex items-center space-x-2"
                          >
                            <LogOut size={16} />
                            <span>Log Out</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      to="/login"
                      className="bg-gradient-get-started hover:opacity-90 text-primary-navy px-6 py-2 rounded-lg font-semibold transition-all text-sm"
                    >
                      Login
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-primary-navy border-t border-gray-700 px-6 py-4 rounded-b-[2.5rem]">
              <div className="flex flex-col space-y-3">
                <Link
                  to="/explore"
                  className="text-white text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Explore
                </Link>
                <Link
                  to="/collections"
                  className="text-white text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Collections
                </Link>

                {/* Search button mobile - OCULTO en páginas de auth */}
                {!isAuthPage && (
                  <button
                    onClick={() => {
                      setSearchModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center space-x-2 bg-white bg-opacity-10 text-white px-4 py-2 rounded-lg w-full justify-center text-sm"
                  >
                    <span>Search</span>
                    <Search size={18} />
                  </button>
                )}

                {isAuthenticated ? (
                  <>
                    <Link
                      to={user ? `/profile/${user.username}` : '/profile'}
                      className="text-white text-sm font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="text-white text-sm font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    {user?.role === 'admin' && (
                      <Link
                        to="/admin"
                        className="text-primary-yellow text-sm font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="text-red-400 text-sm font-medium text-left"
                    >
                      Log Out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/register"
                    className="bg-gradient-get-started hover:opacity-90 text-primary-navy px-6 py-2 rounded-lg font-semibold text-center text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                )}
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </>
  );
};

export default Navbar;