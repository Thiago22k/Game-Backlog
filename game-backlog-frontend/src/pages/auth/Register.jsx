import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import usePageTitle from '../../hooks/usePageTitle';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  usePageTitle('Sign Up');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
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

    const result = await register(formData.username, formData.email, formData.password);

    if (result.success) {
      const redirect = localStorage.getItem('redirectAfterLogin');
      if (redirect) {
        localStorage.removeItem('redirectAfterLogin');
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
            <div className="hidden md:flex flex-col justify-center items-center w-80 bg-primary-navy-dark text-white p-8 rounded-l-2xl shadow-xl h-[500px] -mr-4 z-0">
              <h3 className="text-primary-yellow font-bold text-2xl mb-4 uppercase tracking-wide text-center">
                Already have an account?
              </h3>
              <p className="text-white text-base leading-relaxed mb-6 text-center">
                Log in to access your gaming backlog and continue tracking your progress
              </p>
              <Link
                to="/login"
                className="bg-primary-blue hover:bg-opacity-90 text-white font-bold py-3 px-8 rounded-lg uppercase tracking-wide transition-all text-sm"
              >
                Log In
              </Link>
            </div>

            {/* 2. TARJETA PRINCIPAL (REGISTER) */}
            <div className="w-full max-w-md z-10">

              {/* Register Card */}
              <div className="bg-primary-navy-ultra-dark rounded-2xl p-10 shadow-2xl h-full">
                <h2 className="text-primary-yellow font-bold text-3xl mb-8 text-center uppercase tracking-wide">
                  Sign Up
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Username Input */}
                  <div>
                    <label className="block text-white text-sm mb-2">
                      Username
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        className="w-full bg-white bg-opacity-10 text-white px-4 py-3 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow placeholder-gray-500 disabled:opacity-50"
                        placeholder="Choose a username"
                      />
                      <User className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-white text-sm mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        className="w-full bg-white bg-opacity-10 text-white px-4 py-3 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow placeholder-gray-500 disabled:opacity-50"
                        placeholder="Enter your email"
                      />
                      <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    </div>
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
                        placeholder="Create a password"
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
                    {isLoading ? 'Creating account...' : 'Sign Up'}
                  </button>
                </form>

                {/* Footer Links */}
                <div className="mt-8 space-y-3 text-center">
                  <Link to="/" className="block text-gray-400 hover:text-white text-sm transition-all">
                    ← Back to home
                  </Link>
                </div>
              </div>

            </div>

            {/* 3. TARJETA DERECHA */}
            <div className="hidden md:flex flex-col justify-center items-center w-80 bg-primary-navy-dark text-white p-8 rounded-r-2xl shadow-xl h-[500px] -ml-4 z-0">
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

export default Register;