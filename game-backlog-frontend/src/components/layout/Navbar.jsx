import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X, User, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../assets/logo.svg?react';
import SearchModal from './SearchModal';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Detectar si estamos en páginas de autenticación
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  const handleLogout = () => {
    logout();
    navigate('/');
    setProfileDropdownOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <div className="relative w-full flex justify-center mb-8 z-[200]">
        <div className="absolute top-0 left-0 w-full h-12 bg-primary-navy-dark z-0 shadow-sm"></div>
        <nav className="relative z-10 bg-primary-navy-dark rounded-b-[2.5rem] rounded-t-none mx-auto mt-0 shadow-lg w-full max-w-3xl">
          <div className="px-8">
            <div className="flex justify-between items-center h-20">
              
              {/* Mobile: Logo + Hamburger */}
              <div className="flex items-center lg:hidden w-full justify-between">
                <Link to="/" className="flex items-center space-x-2">
                  <Logo className="w-7 h-7 text-white" />
                  <span className="text-white font-bold text-lg">Stackd</span>
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
                    className={`text-white text-base font-medium pb-1 transition-all ${
                      isActive('/explore') ? 'border-b-2 border-white' : 'hover:text-gray-300'
                    }`}
                  >
                    Explore
                  </Link>
                  <Link
                    to="/playlists"
                    className={`text-text-secondary text-base font-medium pb-1 transition-all cursor-not-allowed opacity-50`}
                    onClick={(e) => e.preventDefault()}
                    title="Coming soon"
                  >
                    Playlist
                  </Link>
                </div>

                {/* Center: Logo */}
                <Link to="/" className="flex items-center space-x-2 absolute left-1/2 transform -translate-x-1/2">
                  <Logo className="w-8 h-8 text-white" />
                  <span className="text-white font-bold text-xl">Stackd</span>
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

                  {isAuthenticated ? (
                    /* Profile dropdown */
                    <div className="relative">
                      <button
                        onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                        className="flex items-center space-x-2 text-white hover:text-gray-300 transition-all"
                      >
                        <div className="w-8 h-8 bg-primary-cyan rounded-full flex items-center justify-center">
                          <User size={18} />
                        </div>
                      </button>

                      {profileDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-[200]">
                          <Link
                            to="/profile"
                            className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            My Profile
                          </Link>
                          <Link
                            to="/settings"
                            className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            Settings
                          </Link>
                          <hr className="my-2" />
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <LogOut size={16} />
                            <span>Log Out</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Get Started button */
                    <Link
                      to="/register"
                      className="bg-gradient-get-started hover:opacity-90 text-primary-navy px-6 py-2 rounded-lg font-semibold transition-all text-sm"
                    >
                       Get Started
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
                <span className="text-text-secondary text-sm font-medium opacity-50 cursor-not-allowed">
                  Playlist (Coming soon)
                </span>
                
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
                      to="/profile"
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