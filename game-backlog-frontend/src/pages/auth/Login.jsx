import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import usePageTitle from '../../hooks/usePageTitle';
import AuthLayout from '../../components/auth/AuthLayout';

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
    <AuthLayout>
      <div className="w-full">
        {/* Title & subtitle */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
          Welcome back
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Log in to pick up where you left off.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Identifier Input */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Username / Email
            </label>
            <input
              type="text"
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="w-full h-12 bg-white/[0.07] border border-white/15 focus:border-[#8b7cf6] text-white px-4 rounded-md focus:outline-none transition-colors placeholder-gray-500 text-sm disabled:opacity-50"
              placeholder="Enter your username or email"
            />
          </div>

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-white text-sm font-medium">
                Password
              </label>
              {/* Visible link sin funcionalidad de momento */}
              <button
                type="button"
                onClick={() => {}}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-full h-12 bg-white/[0.07] border border-white/15 focus:border-[#8b7cf6] text-white px-4 pr-11 rounded-md focus:outline-none transition-colors placeholder-gray-500 text-sm disabled:opacity-50"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/15 border border-red-500/40 text-red-300 px-4 py-2.5 rounded-md text-xs">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-primary-yellow hover:bg-yellow-400 text-primary-navy font-bold rounded-md transition-all shadow-md shadow-primary-yellow/10 disabled:opacity-50 text-sm mt-2"
          >
            {isLoading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        {/* Footer navigation */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-sm text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
              Sign up
            </Link>
          </p>

          <div>
            <Link
              to="/explore"
              className="inline-block text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Continue as guest
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;
