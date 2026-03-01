import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import usePageTitle from '../../hooks/usePageTitle';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  usePageTitle('Sign In');

  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Imágenes de fondo aleatorias
  const backgroundImages = [
    'https://images.igdb.com/igdb/image/upload/t_1080p/co5vmg.jpg', // Baldur's Gate 3
    'https://images.igdb.com/igdb/image/upload/t_1080p/co6kz7.jpg', // Elden Ring
    'https://images.igdb.com/igdb/image/upload/t_1080p/co5w4u.jpg', // The Witcher 3
    'https://images.igdb.com/igdb/image/upload/t_1080p/co1r7f.jpg', // God of War
  ];

  const [randomBg] = useState(() =>
    backgroundImages[Math.floor(Math.random() * backgroundImages.length)]
  );

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(formData.identifier, formData.password);

    if (result.success) {
      const redirect = sessionStorage.getItem('redirectAfterLogin');
      sessionStorage.removeItem('redirectAfterLogin');

      const isRelative = (url) => url && url.startsWith('/') && !url.startsWith('//');

      if (isRelative(redirect)) {
        navigate(redirect);
      } else {
        navigate('/');
      }
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-primary-navy relative overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('${randomBg}')`,
          filter: 'blur(8px) brightness(0.4)',
        }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-primary-navy/60" />

      {/* Content */}
      <div className="relative z-10">

        <div className="flex items-center justify-center px-4 pt-32 pb-12 min-h-screen">

          {/* CONTENEDOR FLEX: Tres tarjetas */}
          <div className="flex flex-col md:flex-row items-center justify-center w-full max-w-6xl relative">

            {/* 1. TARJETA IZQUIERDA */}
            <div className="hidden md:flex flex-col justify-center items-center w-80 bg-primary-navy-dark text-white p-8 rounded-l-2xl shadow-xl h-[400px] -mr-4 z-0">
              <h3 className="text-primary-yellow font-bold text-2xl mb-4 uppercase tracking-wide text-center">
                Don't have an account yet?
              </h3>
              <p className="text-white text-base leading-relaxed mb-6 text-center">
                Create your account in seconds and enjoy everything Stackd has to offer
              </p>
              <Link
                to="/register"
                className="bg-primary-blue hover:bg-opacity-90 text-white font-bold py-3 px-8 rounded-lg uppercase tracking-wide transition-all text-sm"
              >
                Sign Up
              </Link>
            </div>

            {/* 2. TARJETA PRINCIPAL (LOGIN) */}
            <div className="w-full max-w-md z-10">

              {/* Login Card Original */}
              <div className="bg-primary-navy-ultra-dark rounded-2xl p-10 shadow-2xl h-full">
                <h2 className="text-primary-yellow font-bold text-3xl mb-8 text-center uppercase tracking-wide">
                  Log In
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Username/Email Input */}
                  <div>
                    <label className="block text-white text-sm mb-2">
                      Username / Email
                    </label>
                    <input
                      type="text"
                      name="identifier"
                      value={formData.identifier}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="w-full bg-white bg-opacity-10 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow placeholder-gray-500 disabled:opacity-50"
                      placeholder="Enter your username or email"
                    />
                  </div>

                  {/* Password Input */}
                  <div>
                    <label className="block text-white text-sm mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        className="w-full bg-white bg-opacity-10 text-white px-4 py-3 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow placeholder-gray-500 disabled:opacity-50"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary-yellow hover:bg-opacity-90 text-primary-navy font-bold py-3 px-8 rounded-lg uppercase tracking-wide transition-all disabled:opacity-50"
                  >
                    {isLoading ? 'Logging in...' : 'Log In'}
                  </button>
                </form>

                {/* Footer Links */}
                <div className="mt-8 space-y-3 text-center">
                  <div className="md:hidden">
                    <span className="text-gray-400 text-sm">Don't have an account? </span>
                    <Link to="/register" className="text-primary-yellow hover:text-white text-sm transition-all font-semibold">
                      Sign Up
                    </Link>
                  </div>
                  <Link to="/forgot-password" className="block text-primary-yellow hover:text-white text-sm transition-all">
                    Forgot your password?
                  </Link>
                  <Link to="/" className="block text-gray-400 hover:text-white text-sm transition-all mt-4">
                    ← Back to home
                  </Link>
                </div>
              </div>

            </div>

            {/* 3. TARJETA DERECHA (NUEVA) */}
            <div className="hidden md:flex flex-col justify-center items-center w-80 bg-primary-navy-dark text-white p-8 rounded-r-2xl shadow-xl h-[400px] -ml-4 z-0">
              <h3 className="text-primary-yellow font-bold text-xl mb-6 uppercase tracking-wide text-center">
                Join the Community
              </h3>

              <div className="space-y-6 w-full">
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary-yellow mb-1">10K+</p>
                  <p className="text-sm text-gray-300">Active Users</p>
                </div>

                <div className="text-center">
                  <p className="text-4xl font-bold text-primary-yellow mb-1">50K+</p>
                  <p className="text-sm text-gray-300">Games Tracked</p>
                </div>

                <div className="text-center">
                  <p className="text-4xl font-bold text-primary-yellow mb-1">100K+</p>
                  <p className="text-sm text-gray-300">Reviews Written</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;