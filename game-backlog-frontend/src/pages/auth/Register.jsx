import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import usePageTitle from '../../hooks/usePageTitle';
import AuthLayout from '../../components/auth/AuthLayout';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  usePageTitle('Sign Up');

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    agreeTerms: false,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (error) setError('');
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setStep(2);
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username.trim()) {
      setError('Please choose a username');
      return;
    }

    if (formData.username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (formData.username.trim().length > 15) {
      setError('Username cannot exceed 15 characters');
      return;
    }

    if (!formData.agreeTerms) {
      setError('You must agree to the Terms and Privacy Policy');
      return;
    }

    setIsLoading(true);

    const result = await register(
      formData.username.trim(),
      formData.email.trim(),
      formData.password
    );

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
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1 w-8 rounded-full transition-colors ${
                step >= 1 ? 'bg-primary-yellow' : 'bg-gray-700'
              }`}
            />
            <span
              className={`h-1 w-8 rounded-full transition-colors ${
                step >= 2 ? 'bg-primary-yellow' : 'bg-gray-700'
              }`}
            />
          </div>
          <span className="text-xs text-gray-400 font-medium">
            Step {step} of 2
          </span>
        </div>

        {step === 1 ? (
          <>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
              Create your account
            </h1>
            <p className="text-gray-400 text-sm mb-8">
              Start with your email and password.
            </p>

            <form onSubmit={handleStep1Submit} className="space-y-5">
              {/* Email Input */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full h-12 bg-white/[0.07] border border-white/15 focus:border-[#8b7cf6] text-white px-4 rounded-md focus:outline-none transition-colors placeholder-gray-500 text-sm"
                  placeholder="you@email.com"
                />
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    className="w-full h-12 bg-white/[0.07] border border-white/15 focus:border-[#8b7cf6] text-white px-4 pr-11 rounded-md focus:outline-none transition-colors placeholder-gray-500 text-sm"
                    placeholder="At least 8 characters"
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

              {/* Continue button */}
              <button
                type="submit"
                className="w-full h-12 bg-primary-yellow hover:bg-yellow-400 text-primary-navy font-bold rounded-md transition-all shadow-md shadow-primary-yellow/10 text-sm mt-2"
              >
                Continue
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
              Pick a username
            </h1>
            <p className="text-gray-400 text-sm mb-8">
              This is how you'll appear in Stackd.
            </p>

            <form onSubmit={handleStep2Submit} className="space-y-5">
              {/* Username Input */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  maxLength={15}
                  disabled={isLoading}
                  className="w-full h-12 bg-white/[0.07] border border-white/15 focus:border-[#8b7cf6] text-white px-4 rounded-md focus:outline-none transition-colors placeholder-gray-500 text-sm disabled:opacity-50"
                  placeholder="Choose a username"
                />
                <p className="text-xs text-gray-400 mt-2">
                  3 to 15 characters. Letters, numbers and underscores.
                </p>
              </div>

              {/* TOS Checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleChange}
                    className="w-4 h-4 rounded-sm bg-white/10 border-white/20 text-primary-yellow focus:ring-0 accent-primary-yellow"
                  />
                  <span className="text-xs text-gray-300">
                    I agree to the{' '}
                    <Link to="/terms" target="_blank" className="text-purple-400 hover:underline">
                      Terms
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" target="_blank" className="text-purple-400 hover:underline">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/15 border border-red-500/40 text-red-300 px-4 py-2.5 rounded-md text-xs">
                  {error}
                </div>
              )}

              {/* Create account button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary-yellow hover:bg-yellow-400 text-primary-navy font-bold rounded-md transition-all shadow-md shadow-primary-yellow/10 disabled:opacity-50 text-sm mt-2"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>

              {/* Back to Step 1 */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setStep(1);
                  }}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Back
                </button>
              </div>
            </form>
          </>
        )}

        {/* Footer navigation */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
              Log in
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

export default Register;
