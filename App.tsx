
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Download, Crown, CheckCircle2, ChevronDown, Trash2, LayoutDashboard, User as UserIcon, LogOut, Flame, Sparkles, CreditCard, Lock, Settings, ChevronRight, Bell, Shield, Home, Menu, FileText, Network, Image as ImageIcon, Upload, Search, Edit2, Save, X, ArrowRight, Star, Shuffle, Check, Smartphone, Globe, Calendar } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';

import { Layout } from './components/Layout';
import { FileUpload } from './components/FileUpload';
import { StudyMode } from './components/StudyMode';
import { AuthPage } from './components/AuthPage';
import { FlashcardReview } from './components/FlashcardReview';
import { Button } from './components/Button';
import { generateFlashcards, FileInput } from './services/geminiService';
import { getSets, saveSet, deleteSet, getUser, saveUser, updateUserStreak, migrateGuestData } from './services/storageService';
import { supabase } from './services/supabase';
import { AppView, CardSet, GenerationStatus, User, GenerationOptions } from './types';
import { CATEGORY_ICONS, APP_NAME } from './constants';

const STRIPE_PUBLIC_KEY = "pk_test_51SnMaUDUWcujK6MFKJkBWvsSe6WqslD4AlqWjSr9dLWLh9SpNkRHGTE8ApWBHHCRa12AHf0jCyZBZiS91OdlajaT00XfXJ3wMy";

const generateId = () => Math.random().toString(36).substr(2, 9);

const BrainIcon = ({ className }: { className?: string }) => (
    <img 
        src="https://img.icons8.com/?size=100&id=a1qLTYFAxwQO&format=png&color=000000" 
        alt="Brain" 
        className={`object-contain ${className}`} 
    />
);

// --- 3D Visual Elements ---
const FloatingShape = ({ className, delay = 0, duration = 10 }: { className?: string, delay?: number, duration?: number }) => (
    <motion.div
        animate={{ 
            y: [0, -40, 0], 
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
        }}
        transition={{ 
            duration: duration, 
            repeat: Infinity, 
            ease: "easeInOut", 
            delay: delay 
        }}
        className={`absolute pointer-events-none blur-[60px] opacity-60 mix-blend-multiply ${className}`}
    />
);

// --- Sleek Loading Screen ---
const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stage1 = setTimeout(() => setProgress(20), 600);
    const stage2 = setTimeout(() => setProgress(50), 2000);
    const stage3 = setTimeout(() => setProgress(85), 4500);
    const stage4 = setTimeout(() => setProgress(95), 7000);

    return () => {
        clearTimeout(stage1);
        clearTimeout(stage2);
        clearTimeout(stage3);
        clearTimeout(stage4);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Themed Background */}
        <div className="absolute inset-0 pointer-events-none">
            <FloatingShape className="w-[600px] h-[600px] bg-purple-200 rounded-full -top-40 -right-20 blur-[100px]" duration={15} />
            <FloatingShape className="w-[500px] h-[500px] bg-blue-200 rounded-full bottom-0 left-0 blur-[80px]" delay={2} duration={18} />
        </div>

        <div className="relative z-10 flex flex-col items-center">
            {/* Sleek Spinner */}
            <div className="w-16 h-16 mb-8 relative">
                <div className="absolute inset-0 border-[3px] border-indigo-100 rounded-full"></div>
                <div className="absolute inset-0 border-[3px] border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            
            {/* Minimal Bar */}
            <div className="w-64 bg-slate-200/50 rounded-full h-1 overflow-hidden backdrop-blur-sm">
                <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    </div>
  );
};

// --- Improved Checkout View (Stripe Compatible) ---
const CheckoutView: React.FC<{ 
    onComplete: () => void, 
    onCancel: () => void, 
    price: string, 
    planType: 'monthly' | 'yearly' 
}> = ({ onComplete, onCancel, price, planType }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple' | 'google'>('card');
    const [error, setError] = useState<string | null>(null);
    
    // Form State
    const [cardNum, setCardNum] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [name, setName] = useState('');

    // Luhn Algorithm to validate credit card numbers
    const isValidCard = (value: string) => {
        // Remove all non-digit characters
        const cleanValue = value.replace(/\D/g, '');
        if (!cleanValue) return false;

        let nCheck = 0, bEven = false;
        for (let n = cleanValue.length - 1; n >= 0; n--) {
            let cDigit = cleanValue.charAt(n);
            let nDigit = parseInt(cDigit, 10);
            if (bEven) {
                if ((nDigit *= 2) > 9) nDigit -= 9;
            }
            nCheck += nDigit;
            bEven = !bEven;
        }
        return (nCheck % 10) === 0;
    };

    const handlePay = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        // Basic Validation
        if (paymentMethod === 'card') {
            if (!isValidCard(cardNum)) {
                setError("Invalid Card Number. Please check your details.");
                return;
            }
            if (cvc.length < 3) {
                setError("Invalid CVC.");
                return;
            }
        }

        setIsProcessing(true);
        
        console.log("Connecting to Stripe...");
        console.log(`Key: ${STRIPE_PUBLIC_KEY}`);
        console.log(`Charging: ${price} for ${planType} plan`);

        // Simulate API latency & Processing
        setTimeout(() => {
            // For production, this is where you would await stripe.confirmCardPayment()
            setIsProcessing(false);
            onComplete();
        }, 2500);
    };

    const formatCard = (val: string) => val.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
    const formatExpiry = (val: string) => val.replace(/\D/g, '').replace(/(.{2})/, '$1/').slice(0, 5);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-white">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-white -z-10"></div>
             <FloatingShape className="w-96 h-96 bg-purple-300 -top-20 -left-20 rounded-full" />
             <FloatingShape className="w-96 h-96 bg-blue-300 bottom-0 right-0 rounded-full" delay={2} />

             <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-4xl bg-white/80 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-white/50 overflow-hidden flex flex-col md:flex-row"
             >
                {/* Summary Section */}
                <div className="w-full md:w-5/12 bg-slate-50 p-8 border-r border-slate-100 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                    <div>
                        <button onClick={onCancel} className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-8">
                            <ArrowRight className="rotate-180" size={16}/> Back
                        </button>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Summary</h2>
                        <p className="text-slate-500 text-sm mb-8">Upgrade to FlashCard AI Pro</p>
                        
                        <div className="flex items-center gap-4 mb-6">
                             <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                 <Crown size={32} />
                             </div>
                             <div>
                                 <h3 className="font-bold text-slate-900 capitalize">Pro {planType}</h3>
                                 <p className="text-sm text-slate-500">Billed {planType}</p>
                             </div>
                        </div>

                        <div className="space-y-3 py-6 border-t border-slate-200">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Subtotal</span>
                                <span className="font-medium">{price}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Tax</span>
                                <span className="font-medium">$0.00</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold pt-4 border-t border-slate-200 mt-2">
                                <span>Total due</span>
                                <span>{price}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-4">
                        <Lock size={10} /> Secure checkout powered by Stripe
                    </div>
                </div>

                {/* Payment Form */}
                <div className="w-full md:w-7/12 p-8 md:p-12">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Payment Details</h2>
                    
                    {/* Payment Methods */}
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        <button 
                            onClick={() => setPaymentMethod('card')}
                            className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'card' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
                        >
                            <CreditCard size={20} />
                            <span className="text-xs font-bold">Card</span>
                        </button>
                        <button 
                            onClick={() => setPaymentMethod('apple')}
                            className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'apple' ? 'border-black bg-black text-white' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
                        >
                            <Smartphone size={20} />
                            <span className="text-xs font-bold">Apple Pay</span>
                        </button>
                        <button 
                            onClick={() => setPaymentMethod('google')}
                            className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'google' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
                        >
                            <Globe size={20} />
                            <span className="text-xs font-bold">Google Pay</span>
                        </button>
                    </div>

                    {paymentMethod === 'card' ? (
                        <form onSubmit={handlePay} className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Card Information</label>
                                    <div className="relative">
                                        <input type="text" placeholder="0000 0000 0000 0000" value={cardNum} onChange={(e) => {setCardNum(formatCard(e.target.value)); setError(null);}} className={`w-full pl-12 pr-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-mono ${error ? 'border-red-500' : 'border-slate-200'}`} maxLength={19} required />
                                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    </div>
                                    {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Expiry Date</label>
                                        <input type="text" placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-mono" maxLength={5} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">CVC</label>
                                        <div className="relative">
                                            <input type="text" placeholder="123" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none font-mono" maxLength={4} required />
                                            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Cardholder Name</label>
                                    <input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none" required />
                                </div>
                            </div>
                            <Button type="submit" isLoading={isProcessing} className="w-full py-4 text-lg font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 hover:shadow-xl transition-all">
                                Pay {price}
                            </Button>
                        </form>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center animate-pulse">
                                {paymentMethod === 'apple' ? <Smartphone size={32} /> : <Globe size={32} />}
                            </div>
                            <p className="text-slate-500 text-center max-w-xs">
                                Redirecting to {paymentMethod === 'apple' ? 'Apple Pay' : 'Google Pay'} secure checkout...
                            </p>
                            <Button onClick={handlePay} isLoading={isProcessing} className="w-full py-4 text-lg font-bold rounded-xl bg-black text-white hover:bg-slate-800">
                                Continue with {paymentMethod === 'apple' ? 'Apple Pay' : 'Google Pay'}
                            </Button>
                        </div>
                    )}
                </div>
             </motion.div>
        </div>
    );
};

// --- Improved Pricing View (Feature Comparison) ---
const PricingView: React.FC<{ 
    onUpgrade: (plan: 'monthly' | 'yearly') => void;
    onLogin: () => void;
    user: User | null;
}> = ({ onUpgrade, onLogin, user }) => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const price = billingCycle === 'monthly' ? '$4.99' : '$25.00';
    const period = billingCycle === 'monthly' ? '/mo' : '/yr';

    return (
        <div className="min-h-screen relative overflow-hidden bg-[#F8FAFC]">
            {/* Background Spline-like Gradients */}
            <div className="absolute inset-0 pointer-events-none">
                <FloatingShape className="w-[800px] h-[800px] bg-purple-200 rounded-full -top-40 -right-20 blur-[100px]" duration={15} />
                <FloatingShape className="w-[600px] h-[600px] bg-blue-200 rounded-full top-40 -left-20 blur-[80px]" delay={2} duration={18} />
                <FloatingShape className="w-[400px] h-[400px] bg-pink-200 rounded-full bottom-0 left-1/2 blur-[80px]" delay={4} duration={12} />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
                <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24 mb-24">
                    {/* Text Content */}
                    <div className="flex-1 text-center lg:text-left">
                        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-5xl sm:text-7xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                            Amplify your <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">growth</span> with <br/><span className="inline-block border-2 border-indigo-100 bg-indigo-50/50 px-4 rounded-full text-indigo-600">Smart AI</span> insights.
                        </motion.h1>
                        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-lg text-slate-500 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">Join thousands of students transforming messy notes into perfect study materials. Unlimited generation, mind maps, and priority access.</motion.p>
                    </div>

                    {/* 3D Glass Card Visual */}
                    <div className="flex-1 w-full max-w-md lg:max-w-full relative perspective-1000">
                         <motion.div initial={{ opacity: 0, rotateY: -10, x: 50 }} animate={{ opacity: 1, rotateY: 0, x: 0 }} transition={{ duration: 1, type: "spring" }} className="relative z-20 bg-white/60 backdrop-blur-2xl rounded-[40px] border border-white/50 shadow-2xl shadow-indigo-500/10 p-8 sm:p-12 overflow-hidden">
                            {/* Removed Background Crown Icon */}
                            <div className="relative z-10">
                                {/* Billing Toggle */}
                                <div className="flex justify-center mb-8">
                                    <div className="bg-slate-100 p-1 rounded-xl inline-flex relative">
                                        <motion.div 
                                            className="absolute inset-y-1 bg-white rounded-lg shadow-sm"
                                            initial={false}
                                            animate={{ 
                                                left: billingCycle === 'monthly' ? '4px' : '50%',
                                                width: 'calc(50% - 4px)'
                                            }}
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                        <button onClick={() => setBillingCycle('monthly')} className={`relative z-10 px-6 py-2 text-sm font-bold transition-colors ${billingCycle === 'monthly' ? 'text-indigo-600' : 'text-slate-500'}`}>Monthly</button>
                                        <button onClick={() => setBillingCycle('yearly')} className={`relative z-10 px-6 py-2 text-sm font-bold transition-colors ${billingCycle === 'yearly' ? 'text-indigo-600' : 'text-slate-500'}`}>
                                            Yearly <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full ml-1">-58%</span>
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-3xl font-bold text-slate-900 mb-2">Pro {billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}</h3>
                                <div className="flex items-baseline gap-1 mb-8">
                                    <span className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{price}</span>
                                    <span className="text-slate-500 font-medium">{period}</span>
                                </div>
                                <div className="space-y-5 mb-10">
                                    {['Unlimited Flashcards', 'PDF & Image Uploads', 'Mind Map Generation', 'Priority AI Processing', 'Detailed Summaries'].map((item, i) => (
                                        <div key={i} className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0"><CheckCircle2 size={14} strokeWidth={3} /></div><span className="text-slate-700 font-medium">{item}</span></div>
                                    ))}
                                </div>
                                <Button onClick={user ? (user.isPremium ? () => {} : () => onUpgrade(billingCycle)) : onLogin} className="w-full py-4 rounded-2xl text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:shadow-indigo-500/30 border-none">{user?.isPremium ? 'Plan Active' : 'Upgrade Now'}</Button>
                            </div>
                         </motion.div>
                         <motion.div animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-12 -right-12 w-32 h-32 bg-purple-400 rounded-3xl blur-md opacity-80 mix-blend-multiply z-10" style={{ borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' }} />
                         <motion.div animate={{ y: [0, 30, 0], rotate: [0, -10, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-8 -left-8 w-40 h-40 bg-blue-400 rounded-full blur-md opacity-80 mix-blend-multiply z-30" style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }} />
                    </div>
                </div>

                {/* Feature Comparison Table */}
                <div className="max-w-5xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                    <div className="p-8 border-b border-slate-100">
                        <h3 className="text-2xl font-bold text-slate-900 text-center">Compare Plans</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="p-4 sm:p-6 text-sm font-semibold text-slate-500 uppercase tracking-wider w-1/3">Feature</th>
                                    <th className="p-4 sm:p-6 text-center w-1/3">
                                        <span className="block text-lg font-bold text-slate-800">Free</span>
                                    </th>
                                    <th className="p-4 sm:p-6 text-center w-1/3 bg-indigo-50/30">
                                        <span className="block text-lg font-bold text-indigo-600 flex items-center justify-center gap-2">Pro <Crown size={16}/></span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[
                                    { name: 'Flashcards per month', free: '100', pro: 'Unlimited' },
                                    { name: 'PDF & Image Uploads', free: '5 files', pro: 'Unlimited' },
                                    { name: 'Mind Map Generation', free: 'Basic', pro: 'Advanced' },
                                    { name: 'AI Summaries', free: <X size={18} className="text-slate-300 mx-auto"/>, pro: <CheckCircle2 size={18} className="text-green-500 mx-auto"/> },
                                    { name: 'Custom Backgrounds', free: 'Limited', pro: 'Unlimited' },
                                    { name: 'Priority Support', free: <X size={18} className="text-slate-300 mx-auto"/>, pro: <CheckCircle2 size={18} className="text-green-500 mx-auto"/> },
                                    { name: 'No Ads', free: <X size={18} className="text-slate-300 mx-auto"/>, pro: <CheckCircle2 size={18} className="text-green-500 mx-auto"/> },
                                ].map((feature, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 sm:p-6 font-medium text-slate-700 text-xs sm:text-base">{feature.name}</td>
                                        <td className="p-4 sm:p-6 text-center text-slate-600 text-xs sm:text-base">{feature.free}</td>
                                        <td className="p-4 sm:p-6 text-center font-bold text-indigo-900 bg-indigo-50/10 text-xs sm:text-base">{feature.pro}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Profile Page Component (New Dashboard Style)
const ProfileView: React.FC<{ 
    user: User, 
    onLogout: () => void, 
    onUpgrade: () => void,
    onNavigateHome: () => void,
    onUpdateUser: (u: User) => void
}> = ({ user, onLogout, onUpgrade, onNavigateHome, onUpdateUser }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'settings'>('overview');
    const [showCheckout, setShowCheckout] = useState(false);
    
    // Edit Profile State
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(user.name);

    // Sidebar Item Component - Light Theme
    const SidebarItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === id 
                ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-200' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
        >
            <Icon size={18} className={activeTab === id ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
            <span className="font-medium">{label}</span>
        </button>
    );

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("Image too large. Please keep under 2MB.");
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target?.result as string;
                const currentFront = user.preferences?.cardBackgroundsFront || user.preferences?.cardBackgrounds || [];
                const currentBack = user.preferences?.cardBackgroundsBack || [];

                const updatedUser = {
                    ...user,
                    preferences: {
                        ...user.preferences,
                        darkMode: user.preferences?.darkMode || false,
                        cardBackgroundsFront: side === 'front' ? [...currentFront, result] : currentFront,
                        cardBackgroundsBack: side === 'back' ? [...currentBack, result] : currentBack,
                        randomizeFront: user.preferences?.randomizeFront ?? true,
                        randomizeBack: user.preferences?.randomizeBack ?? true,
                        selectedFrontIndex: user.preferences?.selectedFrontIndex || 0,
                        selectedBackIndex: user.preferences?.selectedBackIndex || 0
                    }
                };
                onUpdateUser(updatedUser);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeBackground = (index: number, side: 'front' | 'back') => {
        const currentFront = user.preferences?.cardBackgroundsFront || user.preferences?.cardBackgrounds || [];
        const currentBack = user.preferences?.cardBackgroundsBack || [];

        const updatedUser = {
            ...user,
            preferences: {
                ...user.preferences,
                darkMode: user.preferences?.darkMode || false,
                cardBackgroundsFront: side === 'front' ? currentFront.filter((_, i) => i !== index) : currentFront,
                cardBackgroundsBack: side === 'back' ? currentBack.filter((_, i) => i !== index) : currentBack,
                randomizeFront: user.preferences?.randomizeFront ?? true,
                randomizeBack: user.preferences?.randomizeBack ?? true,
                selectedFrontIndex: 0,
                selectedBackIndex: 0
            }
        };
        onUpdateUser(updatedUser);
    };

    const toggleRandom = (side: 'front' | 'back') => {
        const updatedUser = {
            ...user,
            preferences: {
                ...user.preferences,
                darkMode: user.preferences?.darkMode || false,
                cardBackgroundsFront: user.preferences?.cardBackgroundsFront || [],
                cardBackgroundsBack: user.preferences?.cardBackgroundsBack || [],
                randomizeFront: side === 'front' ? !user.preferences?.randomizeFront : (user.preferences?.randomizeFront ?? true),
                randomizeBack: side === 'back' ? !user.preferences?.randomizeBack : (user.preferences?.randomizeBack ?? true),
                selectedFrontIndex: user.preferences?.selectedFrontIndex || 0,
                selectedBackIndex: user.preferences?.selectedBackIndex || 0
            }
        };
        onUpdateUser(updatedUser);
    };

    const selectImage = (index: number, side: 'front' | 'back') => {
         const updatedUser = {
            ...user,
            preferences: {
                ...user.preferences,
                darkMode: user.preferences?.darkMode || false,
                cardBackgroundsFront: user.preferences?.cardBackgroundsFront || [],
                cardBackgroundsBack: user.preferences?.cardBackgroundsBack || [],
                randomizeFront: side === 'front' ? false : (user.preferences?.randomizeFront ?? true),
                randomizeBack: side === 'back' ? false : (user.preferences?.randomizeBack ?? true),
                selectedFrontIndex: side === 'front' ? index : (user.preferences?.selectedFrontIndex || 0),
                selectedBackIndex: side === 'back' ? index : (user.preferences?.selectedBackIndex || 0)
            }
        };
        onUpdateUser(updatedUser);
    };

    const handleSaveProfile = () => {
        const updatedUser = { ...user, name: editName };
        onUpdateUser(updatedUser);
        setIsEditing(false);
    };

    const currentFrontBgs = user.preferences?.cardBackgroundsFront || user.preferences?.cardBackgrounds || [];
    const currentBackBgs = user.preferences?.cardBackgroundsBack || [];
    const isRandFront = user.preferences?.randomizeFront ?? true;
    const isRandBack = user.preferences?.randomizeBack ?? true;
    const selFront = user.preferences?.selectedFrontIndex || 0;
    const selBack = user.preferences?.selectedBackIndex || 0;

    return (
        <div className="flex h-screen bg-slate-50 font-inter">
            {/* Sidebar with Professional Light Theme */}
            <div className="w-64 bg-white text-slate-600 flex flex-col flex-shrink-0 relative z-20 shadow-xl border-r border-slate-200">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={onNavigateHome}>
                         <img 
                            src="https://img.icons8.com/?size=100&id=XVdLRePLrKeo&format=png&color=000000" 
                            alt="Logo" 
                            className="w-8 h-8 opacity-100" 
                        />
                        <span className="text-xl font-bold tracking-tight text-slate-900">{APP_NAME}</span>
                    </div>
                </div>

                <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <div className="text-xs font-bold text-slate-400 uppercase px-4 py-2 tracking-wider">Menu</div>
                    <SidebarItem id="overview" label="Overview" icon={UserIcon} />
                    <SidebarItem id="billing" label="Plan & Billing" icon={CreditCard} />
                    <SidebarItem id="settings" label="Settings" icon={Settings} />
                    
                    <div className="text-xs font-bold text-slate-400 uppercase px-4 py-2 mt-6 tracking-wider">Account</div>
                    <button 
                         onClick={onNavigateHome}
                         className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all"
                    >
                        <Home size={18} />
                        <span className="font-medium">Back to Home</span>
                    </button>
                    <button 
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                        <LogOut size={18} />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-3 px-2">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${user.isPremium ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                            {user.name[0]?.toUpperCase()}
                         </div>
                         <div className="overflow-hidden">
                             <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                             <p className="text-xs text-slate-500 truncate">{user.email}</p>
                         </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50">
                <div className="max-w-5xl mx-auto p-8 lg:p-12">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-slate-900 capitalize">{activeTab.replace('-', ' ')}</h2>
                        <p className="text-slate-500 mt-1">Manage your {activeTab} information</p>
                    </div>

                    {activeTab === 'overview' && (
                        /* Overview Content */
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div className="flex items-center gap-6">
                                    <div className={`w-24 h-24 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-3xl font-bold ${user.isPremium ? 'bg-gradient-to-tr from-amber-300 to-orange-500 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                                        {user.name[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-900">{user.name}</h3>
                                        <p className="text-slate-500">{user.email}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            {user.isPremium ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200"><Crown size={12} /> PRO MEMBER</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">FREE PLAN</span>
                                            )}
                                            <span className="text-xs text-slate-400">Joined 2024</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {!user.isPremium && <Button onClick={() => setActiveTab('billing')} className="bg-slate-900 text-white hover:bg-slate-800">Upgrade to Pro</Button>}
                                    <Button variant="outline" onClick={() => setActiveTab('settings')}>Edit Profile</Button>
                                </div>
                            </div>
                            {/* Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-4"><div className="p-2 bg-orange-50 text-orange-500 rounded-lg"><Flame size={20} /></div><span className="text-xs font-bold text-slate-400 uppercase">Streak</span></div>
                                    <p className="text-3xl font-bold text-slate-900">{user.streak}</p>
                                    <p className="text-sm text-slate-500 mt-1">Days active in a row</p>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-4"><div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg"><LayoutDashboard size={20} /></div><span className="text-xs font-bold text-slate-400 uppercase">Generated</span></div>
                                    <p className="text-3xl font-bold text-slate-900">{user.stats.flashcardsGenerated}</p>
                                    <p className="text-sm text-slate-500 mt-1">Study sets created</p>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-4"><div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg"><BrainIcon className="w-5 h-5" /></div><span className="text-xs font-bold text-slate-400 uppercase">Mastery</span></div>
                                    <p className="text-3xl font-bold text-slate-900">{user.stats.totalScore}</p>
                                    <p className="text-sm text-slate-500 mt-1">Total learning points</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        /* Billing Content */
                        <div className="animate-fade-in">
                            {showCheckout ? (
                                <CheckoutView 
                                    onComplete={() => { onUpgrade(); setShowCheckout(false); }} 
                                    onCancel={() => setShowCheckout(false)} 
                                    price="$4.99"
                                    planType="monthly"
                                />
                            ) : (
                                <div className="flex flex-col gap-8 max-w-4xl">
                                     <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-start mb-6">
                                            <div><h3 className="text-lg font-bold text-slate-900">Current Subscription</h3><p className="text-slate-500 text-sm">Manage your billing and payment details.</p></div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${user.isPremium ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{user.isPremium ? 'Premium' : 'Free Tier'}</span>
                                        </div>
                                        {!user.isPremium ? (
                                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex items-center justify-between"><div><p className="font-semibold text-slate-900">Upgrade to Pro</p><p className="text-sm text-slate-500">Unlock unlimited generation and advanced features.</p></div><Button onClick={() => setShowCheckout(true)}>Upgrade for $4.99</Button></div>
                                        ) : (
                                             <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 flex items-center justify-between"><div><p className="font-semibold text-indigo-900">Pro Plan Active</p><p className="text-sm text-indigo-600">Next billing date: {new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</p></div><Button variant="outline">Manage Subscription</Button></div>
                                        )}
                                     </div>
                                     <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm"><h3 className="text-lg font-bold text-slate-900 mb-6">Billing History</h3><div className="text-center py-8 text-slate-400 text-sm italic">No invoices found.</div></div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-6 animate-fade-in">
                             {/* Profile Info Settings */}
                             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><UserIcon size={20} className="text-indigo-500" />Profile Details</h3>
                                <div className="space-y-4 max-w-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                                        <div className="flex gap-2">
                                            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} disabled={!isEditing} className={`flex-1 px-4 py-2 rounded-xl border ${isEditing ? 'border-indigo-300 bg-white' : 'border-slate-200 bg-slate-50 text-slate-500'} transition-all`} />
                                            {isEditing ? (
                                                <div className="flex gap-2"><Button onClick={handleSaveProfile} className="p-2" title="Save"><Save size={18}/></Button><Button variant="secondary" onClick={() => { setIsEditing(false); setEditName(user.name); }} className="p-2" title="Cancel"><X size={18}/></Button></div>
                                            ) : (
                                                <Button variant="secondary" onClick={() => setIsEditing(true)} className="p-2" title="Edit"><Edit2 size={18}/></Button>
                                            )}
                                        </div>
                                    </div>
                                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label><input type="text" value={user.email || ''} disabled className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed" /><p className="text-xs text-slate-400 mt-1">Email cannot be changed directly.</p></div>
                                </div>
                             </div>

                             {/* Custom Backgrounds - Front */}
                             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><ImageIcon size={20} className="text-indigo-500" /> Front Card Images (Question)</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-slate-600">Randomize</span>
                                        <button onClick={() => toggleRandom('front')} className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${isRandFront ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isRandFront ? 'translate-x-6' : ''}`}></div>
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                                    {currentFrontBgs.map((bg, idx) => (
                                        <div key={idx} 
                                            onClick={() => !isRandFront && selectImage(idx, 'front')}
                                            className={`relative aspect-[3/4] rounded-lg overflow-hidden border cursor-pointer group transition-all ${!isRandFront && selFront === idx ? 'ring-4 ring-indigo-500 border-indigo-500' : 'border-slate-200'}`}
                                        >
                                            <img src={bg} alt="background" className="w-full h-full object-cover" />
                                            <button onClick={(e) => { e.stopPropagation(); removeBackground(idx, 'front'); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                                            {!isRandFront && selFront === idx && <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center"><CheckCircle2 className="text-white drop-shadow-md" size={32} /></div>}
                                        </div>
                                    ))}
                                    <label className="aspect-[3/4] rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col items-center justify-center text-slate-400 hover:text-indigo-500"><Upload size={24} className="mb-2" /><span className="text-xs font-bold">Upload</span><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'front')} className="hidden" /></label>
                                </div>
                             </div>

                             {/* Custom Backgrounds - Back */}
                             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><ImageIcon size={20} className="text-indigo-500" /> Back Card Images (Answer)</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-slate-600">Randomize</span>
                                        <button onClick={() => toggleRandom('back')} className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${isRandBack ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isRandBack ? 'translate-x-6' : ''}`}></div>
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                                    {currentBackBgs.map((bg, idx) => (
                                        <div key={idx} 
                                            onClick={() => !isRandBack && selectImage(idx, 'back')}
                                            className={`relative aspect-[3/4] rounded-lg overflow-hidden border cursor-pointer group transition-all ${!isRandBack && selBack === idx ? 'ring-4 ring-indigo-500 border-indigo-500' : 'border-slate-200'}`}
                                        >
                                            <img src={bg} alt="background" className="w-full h-full object-cover" />
                                            <button onClick={(e) => { e.stopPropagation(); removeBackground(idx, 'back'); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                                            {!isRandBack && selBack === idx && <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center"><CheckCircle2 className="text-white drop-shadow-md" size={32} /></div>}
                                        </div>
                                    ))}
                                    <label className="aspect-[3/4] rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col items-center justify-center text-slate-400 hover:text-indigo-500"><Upload size={24} className="mb-2" /><span className="text-xs font-bold">Upload</span><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'back')} className="hidden" /></label>
                                </div>
                             </div>

                             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 max-w-2xl">
                                {[
                                    { icon: Bell, label: 'Notifications', desc: 'Manage your daily reminders' },
                                    { icon: Shield, label: 'Security', desc: 'Password and 2FA settings' }
                                ].map((item, i) => (
                                    <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group first:rounded-t-2xl last:rounded-b-2xl">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                <item.icon size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-800">{item.label}</h4>
                                                <p className="text-xs text-slate-500">{item.desc}</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-400" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('landing');
  const [sets, setSets] = useState<CardSet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [initialStudyFeature, setInitialStudyFeature] = useState<'none' | 'summary' | 'mindmap'>('none');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pending set to be reviewed
  const [pendingSet, setPendingSet] = useState<CardSet | null>(null);
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);

  // Faster Smooth Spring Transitions
  const pageVariants = {
    initial: { opacity: 0, scale: 0.99, filter: 'blur(3px)' },
    in: { opacity: 1, scale: 1, filter: 'blur(0px)' },
    out: { opacity: 0, scale: 1.01, filter: 'blur(3px)' }
  };

  const pageTransition = {
    type: "spring",
    stiffness: 300,
    damping: 30,
    mass: 1
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const savedUser = getUser();
        if (savedUser && savedUser.id === session.user.id) {
            setUser(savedUser);
            // PERSISTENCE FIX: Load sets immediately when session is restored
            setSets(getSets(savedUser.id));
        } else {
             const u: User = {
                id: session.user.id,
                name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Student',
                email: session.user.email,
                isPremium: false, 
                streak: 0,
                stats: { flashcardsGenerated: 0, summariesGenerated: 0, mindmapsGenerated: 0, totalScore: 0 },
                preferences: { darkMode: false, cardBackgroundsFront: [], cardBackgroundsBack: [], randomizeFront: true, randomizeBack: true, selectedFrontIndex: 0, selectedBackIndex: 0 }
            };
            setUser(u);
            // PERSISTENCE FIX: Load sets for new/unknown user session from storage if any
            setSets(getSets(u.id));
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
         migrateGuestData(session.user.id);
         const savedUser = getUser();
         let finalUser: User;
         if (savedUser && savedUser.id === session.user.id) {
             finalUser = savedUser;
         } else {
             finalUser = {
                id: session.user.id,
                name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Student',
                email: session.user.email,
                isPremium: false,
                streak: 0,
                stats: { flashcardsGenerated: 0, summariesGenerated: 0, mindmapsGenerated: 0, totalScore: 0 },
                preferences: { darkMode: false, cardBackgroundsFront: [], cardBackgroundsBack: [], randomizeFront: true, randomizeBack: true, selectedFrontIndex: 0, selectedBackIndex: 0 }
             };
         }
         saveUser(finalUser);
         setUser(finalUser);
         setSets(getSets(finalUser.id)); 
         setView((prev) => prev === 'auth' ? 'library' : prev);
      } else {
        setUser(null);
        setSets(getSets()); // Load guest sets on logout
        if (view === 'library' || view === 'profile') setView('landing');
      }
    });
    return () => subscription.unsubscribe();
  }, [view]);

  // Fallback for guest mode or when user state changes null -> loaded
  useEffect(() => {
    if (!user) {
        setSets(getSets());
    }
  }, [user]);

  const handleUpdateUser = (updatedUser: User) => { saveUser(updatedUser); setUser(updatedUser); };
  const handleLoginNavigation = () => { setView('auth'); };
  const handleLibraryNavigation = () => { if (user) { setView('library'); } else { setView('auth'); } };
  const handleLogout = async () => { await supabase.auth.signOut(); setView('landing'); setSets([]); };
  const handleGoPremium = () => { setView('pricing'); };
  const handleCheckoutSuccess = () => { if (user) { const updated = { ...user, isPremium: true }; handleUpdateUser(updated); setShowCheckout(false); alert("Purchase Successful! Welcome to Premium."); } };
  const handleSessionComplete = () => { if (user) { const updated = updateUserStreak(); if (updated) setUser(updated); } };
  
  const handleCreateSet = async (text: string, files: FileInput[], options: GenerationOptions) => {
    setGenerationStatus(GenerationStatus.PROCESSING);
    const startTime = Date.now();
    try {
      const { topic, cards } = await generateFlashcards(text, files, options);
      const elapsed = Date.now() - startTime;
      if (elapsed < 2000) { await new Promise(resolve => setTimeout(resolve, 2000 - elapsed)); }
      if (!cards || !Array.isArray(cards) || cards.length === 0) { throw new Error("Failed to generate valid flashcards."); }
      const newSet: CardSet = { id: generateId(), title: topic || "New Study Set", createdAt: Date.now(), masteryPercentage: 0, cards: cards.map(c => ({ ...c, id: generateId(), status: 'new' })), description: `Generated from ${files.length > 0 ? 'uploaded files' : 'text input'}`, difficulty: options.difficulty };
      setPendingSet(newSet); setGenerationStatus(GenerationStatus.IDLE); setView('review');
    } catch (error) { console.error(error); alert("Failed to generate content."); setGenerationStatus(GenerationStatus.ERROR); setGenerationStatus(GenerationStatus.IDLE); }
  };

  const handleSaveReviewedSet = (finalSet: CardSet) => {
      saveSet(finalSet, user?.id); setSets(getSets(user?.id)); setActiveSetId(finalSet.id);
      if (user) { const newStats = { ...user.stats, flashcardsGenerated: (user.stats?.flashcardsGenerated || 0) + 1 }; const updatedUser = { ...user, stats: newStats }; handleUpdateUser(updatedUser); }
      setPendingSet(null); setView('study');
  };

  const handleDeleteSet = (e: React.MouseEvent, id: string) => { e.stopPropagation(); if (confirm("Delete this set?")) { deleteSet(id, user?.id); setSets(getSets(user?.id)); } };
  const handleQuickAction = (e: React.MouseEvent, id: string, action: 'summary' | 'mindmap') => { e.stopPropagation(); setActiveSetId(id); setInitialStudyFeature(action); setView('study'); };
  
  const activeSet = sets.find(s => s.id === activeSetId);
  const filteredSets = sets.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));

  if (generationStatus === GenerationStatus.PROCESSING) { return <LoadingScreen />; }

  return (
    <Layout 
        activeView={view} 
        onNavigateHome={() => setView('landing')}
        user={user}
        onLogin={handleLoginNavigation}
        onPremium={handleGoPremium}
        onLibrary={handleLibraryNavigation}
        onProfile={() => setView('profile')}
    >
      <AnimatePresence mode='wait'>
        {view === 'auth' && ( <motion.div key="auth" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}> <AuthPage onSuccess={() => setView('library')} onNavigateHome={() => setView('landing')} /> </motion.div> )}
        {view === 'profile' && user && ( <motion.div key="profile" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="h-screen absolute inset-0 z-40 bg-white"> <ProfileView user={user} onLogout={handleLogout} onUpgrade={() => setShowCheckout(true)} onNavigateHome={() => setView('library')} onUpdateUser={handleUpdateUser} /> </motion.div> )}
        {view === 'pricing' && ( <motion.div key="pricing" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}> {showCheckout ? ( <CheckoutView onComplete={() => { handleCheckoutSuccess(); setView('library'); }} onCancel={() => setShowCheckout(false)} price={selectedPlan === 'monthly' ? '$4.99' : '$25.00'} planType={selectedPlan} /> ) : ( <PricingView onUpgrade={(plan) => { setSelectedPlan(plan); setShowCheckout(true); }} onLogin={handleLoginNavigation} user={user} /> )} </motion.div> )}
        {view === 'review' && pendingSet && ( <motion.div key="review" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}> <FlashcardReview initialSet={pendingSet} onSave={handleSaveReviewedSet} onCancel={() => { setPendingSet(null); setView('landing'); }} /> </motion.div> )}
        {view === 'landing' && ( <motion.div key="landing" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="max-w-3xl mx-auto pt-4"> <div className="text-center mb-10"> <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3"> Turn messy notes into <span className="text-indigo-600">A+ Flashcards</span> </h2> <p className="text-lg text-slate-500"> Upload PDFs, images, or text. Let AI handle the rest. </p> </div> <FileUpload onContentReady={handleCreateSet} isProcessing={false} /> </motion.div> )}
        
        {view === 'library' && (
          <motion.div key="library" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div><h2 className="text-3xl font-bold text-slate-900">Your Library</h2><p className="text-slate-500 mt-1">Manage your generated sets.</p></div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                 <div className="relative flex-1 sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Search sets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm text-slate-700 placeholder:text-slate-400 shadow-sm" /></div>
                 <Button onClick={() => setView('landing')} icon={<Plus size={18} />} className="shrink-0">New Set</Button>
              </div>
            </div>
            {sets.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300"><div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-500"><BrainIcon className="w-8 h-8 opacity-50" /></div><h3 className="text-xl font-medium text-slate-900">No sets created yet</h3><Button onClick={() => setView('landing')} className="mt-4">Get Started</Button></div>
            ) : (
                <>
                {filteredSets.length === 0 ? (
                     <div className="text-center py-20"><div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400"><Search size={32} /></div><h3 className="text-lg font-medium text-slate-900">No matching sets found</h3><p className="text-slate-500 mt-1">Try a different search term</p></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredSets.map(set => {
                      const Icon = CATEGORY_ICONS[set.title.split(' ')[0].toLowerCase()] || CATEGORY_ICONS.default;
                      return (
                        <div key={set.id} onClick={() => { setActiveSetId(set.id); setInitialStudyFeature('none'); setView('study'); }} className="group bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 rounded-3xl transition-all cursor-pointer p-6 flex flex-col justify-between h-56 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                          <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all text-slate-500"><Icon size={24} /></div>
                              <button onClick={(e) => handleDeleteSet(e, set.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"><Trash2 size={18} /></button>
                            </div>
                            <h3 className="font-bold text-lg text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">{set.title}</h3>
                            <p className="text-slate-500 text-sm mt-1">{set.cards?.length || 0} cards • {set.difficulty || 'Medium'}</p>
                          </div>
                          <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-3">
                               <button onClick={(e) => handleQuickAction(e, set.id, 'summary')} className="flex-1 py-1.5 px-2 bg-white/50 border border-slate-100 text-indigo-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-indigo-50 transition-colors" title="View Summary"><FileText size={14} /> Summary</button>
                               <button onClick={(e) => handleQuickAction(e, set.id, 'mindmap')} className="flex-1 py-1.5 px-2 bg-white/50 border border-slate-100 text-purple-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-purple-50 transition-colors" title="View Mind Map"><Network size={14} /> Mind Map</button>
                            </div>
                            <div className="flex justify-between text-xs font-medium text-slate-500 mb-2"><span>Mastery</span><span>{set.masteryPercentage}%</span></div>
                            <div className="w-full bg-slate-200/50 rounded-full h-1.5 overflow-hidden"><div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${set.masteryPercentage}%` }} /></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                </>
            )}
          </motion.div>
        )}

        {view === 'study' && activeSet && ( <motion.div key="study" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="h-full"> <StudyMode set={activeSet} onExit={() => setView('library')} onUpdateSet={(updated) => { saveSet(updated, user?.id); setSets(getSets(user?.id)); }} onSessionComplete={handleSessionComplete} initialFeature={initialStudyFeature} /> </motion.div> )}
      </AnimatePresence>
    </Layout>
  );
};

export default App;
