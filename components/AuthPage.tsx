
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Button } from './Button';
import { Mail, AlertCircle, Eye, EyeOff, Check, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_NAME } from '../constants';

interface AuthPageProps {
  onSuccess: () => void;
  onNavigateHome: () => void;
}

type AuthMode = 'login' | 'signup' | 'verify' | 'forgot';

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, onNavigateHome }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Form State
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
            if (error.message.includes("Invalid login credentials")) {
                throw new Error("Invalid password or email.");
            }
            throw error;
        }
        onSuccess();
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
            throw new Error("Passwords do not match.");
        }
        if (username.length < 2) {
            throw new Error("Username must be at least 2 characters.");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
              data: {
                  full_name: username,
              }
          }
        });
        
        if (error) throw error;
        
        // Check if user already exists
        if (data.user && data.user.identities && data.user.identities.length === 0) {
             throw new Error("This email is already registered. Please log in instead.");
        }
        
        setMode('verify');
      } else if (mode === 'forgot') {
         const { error } = await supabase.auth.resetPasswordForEmail(email, {
             redirectTo: window.location.href,
         });
         if (error) throw error;
         alert("Password reset instructions have been sent to your email.");
         setMode('login');
      }
    } catch (err: any) {
      let msg = err.message || "An authentication error occurred";
      if (msg.includes("already registered") || msg.includes("unique constraint")) {
          msg = "This email is already registered. Please log in instead.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
  };

  // Verification Screen
  if (mode === 'verify') {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-white px-4 font-dm-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
             <Mail size={40} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Verify your email</h2>
          <p className="text-slate-500 mb-8 text-lg">
            We've sent a link to <strong className="text-slate-800">{email}</strong>. <br/>Check your inbox to get started.
          </p>
          <Button 
            onClick={() => switchMode('login')} 
            className="w-full py-4 text-lg rounded-2xl"
          >
            Back to Login
          </Button>
        </motion.div>
      </div>
    );
  }

  // Main Split Layout
  return (
    <div className="flex h-[100dvh] w-full bg-white font-dm-sans overflow-hidden">
      {/* Left Section - Form */}
      <div className="w-full md:w-[45%] lg:w-[40%] xl:w-[35%] h-full flex flex-col relative z-10 bg-white shadow-xl md:shadow-none">
        
        {/* Scrollable Container with centered content logic */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="min-h-full flex flex-col justify-center py-10 px-8 sm:px-12">
                <div className="w-full max-w-md mx-auto">
                    {/* Logo - Clickable - Hover matches Layout.tsx */}
                    <div 
                        className="flex items-center space-x-2 cursor-pointer group mb-6 sm:mb-8 w-fit" 
                        onClick={onNavigateHome}
                    >
                        <img 
                            src="https://img.icons8.com/?size=100&id=XVdLRePLrKeo&format=png&color=000000" 
                            alt="Logo" 
                            className="w-8 h-8 sm:w-10 sm:h-10 group-hover:scale-110 transition-transform object-contain" 
                        />
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{APP_NAME}</h1>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={mode === 'forgot' ? 'forgot' : 'auth'}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                            layout
                        >
                            <motion.div layout className="mb-6 sm:mb-8">
                                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                                    {mode === 'signup' ? 'Create Account' : (mode === 'forgot' ? 'Reset Password' : 'Welcome Back!')}
                                </h2>
                                <p className="text-slate-500 text-sm sm:text-base">
                                    {mode === 'signup' ? 'Join us and start learning smarter' : (mode === 'forgot' ? 'Enter your email to receive instructions' : 'We are happy to see you again')}
                                </p>
                            </motion.div>

                            {/* Pill Toggle */}
                            {mode !== 'forgot' && (
                                <motion.div layout className="flex p-1.5 bg-slate-100 rounded-full mb-6 sm:mb-8 relative">
                                    <motion.div 
                                        className="absolute top-1.5 bottom-1.5 bg-white rounded-full shadow-sm z-0"
                                        layoutId="activeTab"
                                        initial={false}
                                        animate={{ 
                                            left: mode === 'login' ? '6px' : '50%', 
                                            width: 'calc(50% - 6px)' 
                                        }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                    <button 
                                        onClick={() => switchMode('login')}
                                        className={`flex-1 py-2.5 sm:py-3 text-sm font-bold rounded-full z-10 transition-colors relative ${mode === 'login' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Login
                                    </button>
                                    <button 
                                        onClick={() => switchMode('signup')}
                                        className={`flex-1 py-2.5 sm:py-3 text-sm font-bold rounded-full z-10 transition-colors relative ${mode === 'signup' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Sign Up
                                    </button>
                                </motion.div>
                            )}

                            <form onSubmit={handleAuth} className="space-y-4 sm:space-y-5">
                                <AnimatePresence initial={false}>
                                    {/* Username Field (Signup Only) */}
                                    {mode === 'signup' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="relative group">
                                                <input 
                                                    type="text" 
                                                    required={mode === 'signup'}
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    className="w-full px-5 py-3.5 sm:py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all placeholder:text-slate-400 text-slate-900 font-medium text-sm sm:text-base"
                                                    placeholder="Username"
                                                />
                                                <UserIcon className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Email Input */}
                                <motion.div layout className="relative group">
                                    <input 
                                        type="email" 
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-5 py-3.5 sm:py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all placeholder:text-slate-400 text-slate-900 font-medium text-sm sm:text-base"
                                        placeholder="Enter your email"
                                    />
                                    <Mail className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                                </motion.div>

                                {/* Password Input */}
                                {mode !== 'forgot' && (
                                    <motion.div layout className="relative group">
                                        <input 
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-5 py-3.5 sm:py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all placeholder:text-slate-400 text-slate-900 font-medium text-sm sm:text-base"
                                            placeholder="Enter your password"
                                            minLength={6}
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </motion.div>
                                )}

                                <AnimatePresence initial={false}>
                                    {/* Confirm Password Field (Signup Only) */}
                                    {mode === 'signup' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                            animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
                                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="relative group">
                                                <input 
                                                    type={showPassword ? "text" : "password"}
                                                    required={mode === 'signup'}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full px-5 py-3.5 sm:py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all placeholder:text-slate-400 text-slate-900 font-medium text-sm sm:text-base"
                                                    placeholder="Confirm password"
                                                    minLength={6}
                                                />
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40 pointer-events-none">
                                                    <img src="https://img.icons8.com/?size=100&id=43705&format=png&color=000000" alt="Lock" className="w-full h-full object-contain" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Extras Row */}
                                {mode === 'login' && (
                                    <motion.div layout className="flex items-center justify-between text-sm pt-2">
                                        <label className="flex items-center gap-2 cursor-pointer group text-slate-500 hover:text-slate-700">
                                            <div 
                                                className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                                    rememberMe ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
                                                }`}
                                                onClick={(e) => { e.preventDefault(); setRememberMe(!rememberMe); }}
                                            >
                                                {rememberMe && <Check size={12} className="text-white" />}
                                            </div>
                                            <span className="select-none font-medium">Remember me</span>
                                        </label>
                                        
                                        <button 
                                            type="button"
                                            onClick={() => switchMode('forgot')}
                                            className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                                        >
                                            Forgot Password?
                                        </button>
                                    </motion.div>
                                )}

                                {error && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 bg-red-50 text-red-600 text-sm rounded-2xl flex items-start gap-3 border border-red-100"
                                    >
                                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                        <span className="font-medium">{error}</span>
                                    </motion.div>
                                )}

                                <Button 
                                    type="submit" 
                                    isLoading={loading} 
                                    className="w-full py-3.5 sm:py-4 rounded-2xl text-base font-bold bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200 transition-all duration-300 mt-2 sm:mt-4"
                                >
                                    {mode === 'login' && 'Login'}
                                    {mode === 'signup' && 'Create Account'}
                                    {mode === 'forgot' && 'Send Reset Link'}
                                </Button>
                            </form>

                            {mode === 'forgot' && (
                                <div className="mt-6 text-center">
                                    <button 
                                        onClick={() => switchMode('login')}
                                        className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                                    >
                                        Back to Login
                                    </button>
                                </div>
                            )}

                            {/* Social Divider */}
                            {mode === 'login' && (
                                <motion.div layout className="mt-6 sm:mt-8">
                                    <div className="relative flex items-center justify-center mb-6">
                                        <div className="absolute inset-x-0 h-px bg-slate-200"></div>
                                        <span className="relative bg-white px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">OR</span>
                                    </div>
                                    
                                    <button className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all text-slate-700 font-bold bg-white">
                                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                                        Log in with Google
                                    </button>
                                </motion.div>
                            )}
                            
                            <div className="mt-6 sm:mt-8 text-center">
                                <p className="text-xs text-slate-400 font-medium">&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
      </div>

      {/* Right Section - Image Background */}
      <div className="hidden md:block md:w-[55%] lg:w-[60%] xl:w-[65%] relative overflow-hidden bg-slate-900">
         <img 
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
            className="absolute inset-0 w-full h-full object-cover" 
            alt="Abstract Blue Background"
         />
         <div className="absolute inset-0 bg-indigo-900/10"></div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};