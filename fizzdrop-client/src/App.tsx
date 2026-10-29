import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation/Navigation';
import HomePage from './pages/HomePage';
import ProductListPage from './pages/ProductListPage/ProductListPage';
import AdminDashboard from './pages/Admin/AdminDashboard';
import SuperadminDashboard from './pages/Superadmin/SuperadminDashboard';
import { AuthProvider } from './context/AuthContext';

function App() {
  const [cartCount, setCartCount] = useState<number>(0);
  const [selectedBranchId, setSelectedBranchId] = useState<number | string>('');
  const [outlets, setOutlets] = useState<{ branchId: string | number; branchName: string }[]>([]);

  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/outlets');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setOutlets(
              data.map((o: any) => ({
                branchId: o.outlet_id || o.branch_id,
                branchName: o.outlet_name || o.branch_name,
              }))
            );
          }
        }
      } catch (err) {
        // ignore
      }
    };
    fetchOutlets();
  }, []);

  const handleAddToCart = () => {
    setCartCount((prev) => prev + 1);
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
        {/* Persistent navbar across routes */}
        <Navigation
          cartCount={cartCount}
          outlets={outlets}
          selectedBranch={selectedBranchId}
          onSelectBranch={setSelectedBranchId}
        />

        <main className="flex-1">
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  branchId={selectedBranchId}
                  onAddToCart={handleAddToCart}
                />
              }
            />
            <Route
              path="/shop"
              element={
                <ProductListPage
                  branchId={selectedBranchId}
                  onAddToCart={handleAddToCart}
                />
              }
            />
            <Route
              path="/beverages"
              element={
                <ProductListPage
                  branchId={selectedBranchId}
                  onAddToCart={handleAddToCart}
                />
              }
            />
            <Route
              path="/admin"
              element={<AdminDashboard />}
            />
            <Route
              path="/admin/*"
              element={<AdminDashboard />}
            />
            <Route
              path="/superadmin"
              element={<SuperadminDashboard />}
            />
            <Route
              path="/superadmin/*"
              element={<SuperadminDashboard />}
            />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
