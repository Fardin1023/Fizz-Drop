import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  user_id: number;
  email: string;
  role_id: number;
  role_name: string;
  branch_id: number | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isSupplier: boolean;
  isSuperadmin: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsSupplier: () => Promise<{ success: boolean; error?: string }>;
  loginAsSuperadmin: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('fizzdrop_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('fizzdrop_user');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('fizzdrop_user');
        localStorage.removeItem('fizzdrop_token');
      }
    }
    setIsLoading(false);
  }, [token]);

  const login = async (email: string, password = 'Password123!') => {
    try {
      const res = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Authentication failed' };
      }

      const u = data.user;
      const isSuper = (
        u.role_id === 4 ||
        u.role_id === 1 ||
        u.roleId === 4 ||
        u.roleId === 1 ||
        (u.role_name || u.role || '').toLowerCase().includes('super') ||
        (u.email || '').toLowerCase().includes('superadmin')
      );

      const normalizedUser: User = {
        user_id: u.user_id ?? u.userId ?? (isSuper ? 99 : 4),
        email: u.email,
        role_id: u.role_id ?? u.roleId ?? (isSuper ? 4 : 3),
        role_name: isSuper ? 'Superadmin' : 'Supplier',
        branch_id: u.branch_id ?? u.branchId ?? 1,
      };

      setToken(data.token);
      setUser(normalizedUser);
      localStorage.setItem('fizzdrop_token', data.token);
      localStorage.setItem('fizzdrop_user', JSON.stringify(normalizedUser));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Server connection error' };
    }
  };

  const loginAsSupplier = async () => {
    return login('central.supplier@fizzdrop.com', 'Password123!');
  };

  const loginAsSuperadmin = async () => {
    return login('superadmin@fizzdrop.com', 'Password123!');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('fizzdrop_token');
    localStorage.removeItem('fizzdrop_user');
  };

  const isSuperadmin = Boolean(
    user?.role_id === 4 ||
      user?.role_id === 1 ||
      user?.role_name?.toLowerCase().includes('super') ||
      user?.email?.toLowerCase().includes('superadmin')
  );

  const isSupplier = Boolean(
    user?.role_id === 3 ||
      user?.role_name?.toLowerCase().includes('supplier') ||
      user?.email?.toLowerCase().includes('supplier') ||
      isSuperadmin
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isSupplier,
        isSuperadmin,
        isLoading,
        login,
        loginAsSupplier,
        loginAsSuperadmin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
