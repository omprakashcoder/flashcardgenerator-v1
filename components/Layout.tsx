
import React from 'react';
import { Flame, User as UserIcon, Moon, Sun } from 'lucide-react';
import { APP_NAME } from '../constants';
import { Button } from './Button';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onNavigateHome: () => void;
  user: User | null;
  onLogin: () => void;
  onPremium: () => void; 
  onLibrary: () => void;
  onProfile: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
    children, onNavigateHome, user, onLogin, onPremium, onLibrary, onProfile, activeView 
}) => {
  
  // Hide global header on Auth and Profile pages
  const showHeader = !['auth', 'profile'].includes(activeView);

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 selection:bg-indigo-500/30 bg-slate-50 text-slate-800">
      {showHeader && (
        <header className="sticky top-0 z-30 backdrop-blur-xl border-b px-4 sm:px-6 py-4 transition-colors duration-300 bg-white/80 border-slate-200">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div 
              className="flex items-center space-x-2 cursor-pointer group" 
              onClick={onNavigateHome}
            >
              <img 
                  src="https://img.icons8.com/?size=100&id=XVdLRePLrKeo&format=png&color=000000" 
                  alt="App Logo" 
                  className="w-8 h-8 sm:w-10 sm:h-10 group-hover:scale-110 transition-transform" 
              />
              <h1 className="text-lg sm:text-xl font-bold tracking-tight hidden sm:block text-slate-900">{APP_NAME}</h1>
            </div>

            <div className="flex items-center space-x-4">
              {user && (
                  <div className="hidden sm:flex items-center px-3 py-1 rounded-full text-sm font-medium border group relative cursor-help bg-orange-50 text-orange-600 border-orange-100">
                    <Flame size={16} className="mr-1 fill-orange-500" />
                    <span>{user.streak} Days</span>
                    
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-max px-3 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                        Current Streak: {user.streak} Days
                    </div>
                  </div>
              )}

              <button onClick={onLibrary} className={`text-sm font-medium transition-colors hover:text-indigo-500 ${activeView === 'library' ? 'text-indigo-500' : 'text-slate-600'}`}>
                Library
              </button>
              
              {/* Show Pricing link if User is NULL OR User is NOT Premium */}
              {(!user || !user.isPremium) && (
                <button onClick={onPremium} className={`text-sm font-medium transition-colors hover:text-indigo-500 ${activeView === 'pricing' ? 'text-indigo-500' : 'text-slate-600'}`}>
                    Pricing
                </button>
              )}

              {!user ? (
                  <Button variant="outline" onClick={onLogin} className="py-1 px-3 text-sm rounded-lg">
                      Log In
                  </Button>
              ) : (
                  <div className="ml-2">
                    <button 
                        onClick={onProfile}
                        className={`relative rounded-full transition-all duration-300 hover:scale-105 ${
                            user.isPremium 
                            ? 'p-[2px] bg-gradient-to-tr from-yellow-400 via-orange-500 to-red-500' 
                            : 'p-[2px] bg-slate-200'
                        }`}
                        title="Your Profile"
                    >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border-2 bg-white border-white">
                             <div className={`w-full h-full flex items-center justify-center font-bold ${user.isPremium ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-amber-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                {user.name[0]?.toUpperCase() || 'U'}
                             </div>
                        </div>
                    </button>
                  </div>
              )}
            </div>
          </div>
        </header>
      )}

      <main className={`flex-1 w-full ${['auth', 'profile'].includes(activeView) ? '' : 'max-w-6xl mx-auto p-4 sm:p-6 lg:p-8'}`}>
        {children}
      </main>

      {showHeader && (
        <footer className="py-8 text-center text-sm text-slate-400">
          <p>&copy; {new Date().getFullYear()} {APP_NAME}. Copyrights reserved.</p>
        </footer>
      )}
    </div>
  );
};
