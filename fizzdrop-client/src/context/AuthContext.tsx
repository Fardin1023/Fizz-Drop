import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  user_id: number;
  email: string;
  role_id: number;
  role_name: string;
  branch_id: number | null;
  outlet?: {
    outlet_id: number;
    outlet_name: string;
    franchise_name?: string;
    branch_name?: string;
    location_address?: string;
    city?: string;
    area?: string;
    contact_phone?: string;
    status?: string;
    division_name?: string;
  };
  sales_officer?: {
    id: number;
    officer_code: string;
    name: string;
    email?: string;
    phone: string;
    supplier_id: number;
    district_id?: number;
    city: string;
    assigned_area: string;
    status: string;
    supplier_name?: string;
    notes?: string;
  };
  pre_sales_officer?: {
    id: number;
    psr_code: string;
    name: string;
    phone: string;
    email: string;
    sales_officer_id: number;
    sub_route: string;
    assigned_area: string;
    status: string;
    notes?: string;
    sales_officer_name?: string;
    sales_officer_code?: string;
    outlet_count?: number;
    active_orders_count?: number;
    pending_refunds_count?: number;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isSupplier: boolean;
  isSuperadmin: boolean;
  isOutlet: boolean;
  isSalesOfficer: boolean;
  isPsr: boolean;
  outlet: User['outlet'] | null;
  salesOfficer: User['sales_officer'] | null;
  psr: User['pre_sales_officer'] | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsSupplier: (email?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsSuperadmin: () => Promise<{ success: boolean; error?: string }>;
  loginAsOutlet: (outletId?: number, email?: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsSalesOfficer: (officerId?: number, email?: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsPsr: (psrId?: number, email?: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  registerOutlet: (outletData: any) => Promise<{ success: boolean; error?: string }>;
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

      const isSalesOfficer = (
        u.role_id === 6 ||
        u.roleId === 6 ||
        (u.role_name || u.role || '').toLowerCase().includes('officer') ||
        (u.email || '').toLowerCase().includes('.so@') ||
        Boolean(data.sales_officer || u.sales_officer)
      );

      const isPsr = (
        u.role_id === 7 ||
        u.roleId === 7 ||
        (u.role_name || u.role || '').toLowerCase().includes('psr') ||
        (u.role_name || u.role || '').toLowerCase().includes('presales') ||
        (u.email || '').toLowerCase().includes('.psr@') ||
        Boolean(data.pre_sales_officer || data.psr || u.pre_sales_officer)
      );

      const isOutlet = (
        u.role_id === 2 ||
        u.roleId === 2 ||
        (u.role_name || u.role || '').toLowerCase().includes('outlet') ||
        Boolean(data.outlet || u.outlet)
      );

      const normalizedUser: User = {
        user_id: u.user_id ?? u.userId ?? (isSuper ? 99 : (isSalesOfficer ? 6 : (isPsr ? 7 : 4))),
        email: u.email,
        role_id: isSuper ? 4 : (isSalesOfficer ? 6 : (isPsr ? 7 : (isOutlet ? 2 : 3))),
        role_name: isSuper ? 'Superadmin' : (isSalesOfficer ? 'SalesOfficer' : (isPsr ? 'PreSalesOfficer' : (isOutlet ? 'Outlet' : 'Supplier'))),
        branch_id: u.branch_id ?? u.branchId ?? (isOutlet ? 2 : null),
        outlet: data.outlet || u.outlet,
        sales_officer: data.sales_officer || u.sales_officer,
        pre_sales_officer: data.pre_sales_officer || data.psr || u.pre_sales_officer,
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

  const loginAsOutlet = async (outletId?: number, email?: string, password = 'Password123!') => {
    try {
      const res = await fetch('http://localhost:8080/api/auth/outlet/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outlet_id: outletId, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Outlet login failed' };
      }

      const u = data.user;
      const o = data.outlet || u.outlet;
      const normalizedUser: User = {
        user_id: u.user_id ?? u.userId ?? 1000,
        email: u.email,
        role_id: 2,
        role_name: 'Outlet',
        branch_id: o?.outlet_id ?? u.branch_id ?? 2,
        outlet: o,
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

  const loginAsSalesOfficer = async (officerId?: number, email?: string, password = 'Officer123!') => {
    try {
      const res = await fetch('http://localhost:8080/api/auth/sales-officer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officer_id: officerId, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Sales Officer login failed' };
      }

      const u = data.user;
      const so = data.sales_officer || u.sales_officer;
      const normalizedUser: User = {
        user_id: u.user_id ?? u.userId ?? so?.id ?? 6,
        email: u.email || so?.email,
        role_id: 6,
        role_name: 'SalesOfficer',
        branch_id: null,
        sales_officer: so,
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

  const registerOutlet = async (outletData: any) => {
    try {
      const res = await fetch('http://localhost:8080/api/auth/outlet/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outletData),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to register outlet' };
      }

      const u = data.user;
      const o = data.outlet || u.outlet;
      const normalizedUser: User = {
        user_id: u.user_id ?? u.userId ?? 1000,
        email: u.email,
        role_id: 2,
        role_name: 'Outlet',
        branch_id: o?.outlet_id ?? u.branch_id ?? 2,
        outlet: o,
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

  const loginAsPsr = async (psrId?: number, email?: string, password = 'Psr123!') => {
    try {
      const res = await fetch('http://localhost:8080/api/auth/psr/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ psr_id: psrId, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Pre-Sales Officer login failed' };
      }

      const u = data.user;
      const psr = data.pre_sales_officer || data.psr || u.pre_sales_officer;
      const normalizedUser: User = {
        user_id: u.user_id ?? u.userId ?? (psr?.id ? 200 + psr.id : 201),
        email: u.email || psr?.email,
        role_id: 7,
        role_name: 'PreSalesOfficer',
        branch_id: null,
        pre_sales_officer: psr,
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

  const loginAsSupplier = async (email = 'central.supplier@fizzdrop.com') => {
    return login(email, 'Password123!');
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

  const isOutlet = Boolean(
    user?.role_id === 2 ||
      user?.role_name?.toLowerCase().includes('outlet') ||
      user?.email?.toLowerCase().includes('outlet') ||
      Boolean(user?.outlet)
  );

  const isSalesOfficer = Boolean(
    user?.role_id === 6 ||
      user?.role_name?.toLowerCase().includes('officer') ||
      user?.email?.toLowerCase().includes('.so@') ||
      Boolean(user?.sales_officer)
  );

  const isPsr = Boolean(
    user?.role_id === 7 ||
      user?.role_name?.toLowerCase().includes('psr') ||
      user?.role_name?.toLowerCase().includes('presales') ||
      user?.email?.toLowerCase().includes('.psr@') ||
      Boolean(user?.pre_sales_officer)
  );

  const isSupplier = Boolean(
    (user?.role_id === 3 ||
      user?.role_name?.toLowerCase().includes('supplier') ||
      user?.email?.toLowerCase().includes('supplier')) &&
      !isSalesOfficer &&
      !isOutlet &&
      !isPsr
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isSupplier,
        isSuperadmin,
        isOutlet,
        isSalesOfficer,
        isPsr,
        outlet: user?.outlet || null,
        salesOfficer: user?.sales_officer || null,
        psr: user?.pre_sales_officer || null,
        isLoading,
        login,
        loginAsSupplier,
        loginAsSuperadmin,
        loginAsOutlet,
        loginAsSalesOfficer,
        loginAsPsr,
        registerOutlet,
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
