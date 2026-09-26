import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  signup: (data: {
    loginId: string;
    email: string;
    name?: string;
    password: string;
    confirmPassword: string;
    role?: 'admin' | 'inventory_manager' | 'warehouse_staff';
  }) => Promise<{ requiresOtp: boolean; email: string; devOtpCode?: string }>;
  verifyOtp: (email: string, otpCode: string, purpose: 'signup' | 'password_reset') => Promise<void>;
  forgotPassword: (emailOrLoginId: string) => Promise<{ email?: string; devOtpCode?: string; message: string }>;
  resetPassword: (data: {
    email: string;
    otpCode: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('stocksense_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate existing token on load
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('stocksense_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res: any = await api.get('/auth/me');
        if (res?.user) {
          setUser(res.user);
        } else {
          logout();
        }
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (loginId: string, password: string) => {
    const res: any = await api.post('/auth/login', { loginId, password });
    if (res?.token && res?.user) {
      localStorage.setItem('stocksense_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
  };

  const signup = async (data: {
    loginId: string;
    email: string;
    name?: string;
    password: string;
    confirmPassword: string;
    role?: 'admin' | 'inventory_manager' | 'warehouse_staff';
  }) => {
    const res: any = await api.post('/auth/signup', data);
    return res;
  };

  const verifyOtp = async (email: string, otpCode: string, purpose: 'signup' | 'password_reset') => {
    const res: any = await api.post('/auth/verify-otp', { email, otpCode, purpose });
    if (res?.token && res?.user) {
      localStorage.setItem('stocksense_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
  };

  const forgotPassword = async (emailOrLoginId: string) => {
    const res: any = await api.post('/auth/forgot-password', { emailOrLoginId });
    return res;
  };

  const resetPassword = async (data: {
    email: string;
    otpCode: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    await api.post('/auth/reset-password', data);
  };

  const logout = () => {
    localStorage.removeItem('stocksense_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        verifyOtp,
        forgotPassword,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
