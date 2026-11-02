import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  Filter,
  Package,
  Layers,
  Edit2,
  Trash2,
  Boxes,
  LayoutGrid,
  List,
  RefreshCw,
  AlertCircle,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';
import MerchandiseFormModal, { type MerchandiseItem } from '../Admin/MerchandiseFormModal';
import {
  JACKET_PRESET_SVG,
  HELMET_PRESET_SVG,
  BIKE_PRESET_SVG,
  TSHIRT_PRESET_SVG,
} from '../../assets/merchandisePresets';

export const SuperadminMerchandiseCatalog: React.FC = () => {
  const [items, setItems] = useState<MerchandiseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All Items');
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MerchandiseItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MerchandiseItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchMerchandise = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8080/api/merchandise');
      if (!res.ok) {
        throw new Error(`Failed to load merchandise (${res.status}): ${res.statusText}`);
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unable to connect to merchandise endpoint.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchandise();
  }, []);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    const id = itemToDelete.merchandise_id || itemToDelete.merchandiseId || itemToDelete.id;
    if (!id) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/merchandise/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to delete merchandise item.');
      }
      setItemToDelete(null);
      fetchMerchandise();
    } catch (err: any) {
      alert(err.message || 'Error deleting product');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Distinct Filter options
  const distinctTypes = ['All Items', ...Array.from(new Set(items.map((i) => i.item_type || i.itemType || 'Other')))];
  const distinctBrands = ['All Brands', ...Array.from(new Set(items.map((i) => i.brand)))];

  // Filtered List
  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const type = item.item_type || item.itemType || '';
    const brand = item.brand || '';
    const name = item.name || '';
    const sku = item.sku || '';

    const matchesSearch = !q || name.toLowerCase().includes(q) || sku.toLowerCase().includes(q) || brand.toLowerCase().includes(q);
    const matchesType = selectedType === 'All Items' || type.toLowerCase() === selectedType.toLowerCase();
    const matchesBrand = selectedBrand === 'All Brands' || brand.toLowerCase() === selectedBrand.toLowerCase();

    return matchesSearch && matchesType && matchesBrand;
  });

  // Analytics Metrics
  const totalItems = items.length;
  const totalStock = items.reduce((acc, curr) => acc + (curr.stock_quantity ?? curr.stockQuantity ?? 0), 0);
  const totalValuation = items.reduce(
    (acc, curr) => acc + (curr.price ?? curr.base_price ?? 0) * (curr.stock_quantity ?? curr.stockQuantity ?? 0),
    0
  );
  const activeBrandCount = new Set(items.map((i) => i.brand)).size;

  const getItemFallbackArtwork = (item: MerchandiseItem) => {
    const img = item.image_url || item.imageUrl;
    if (img && img.trim().length > 10) return img;
    const combined = `${item.brand} ${item.item_type || item.itemType || ''} ${item.name}`.toLowerCase();
    if (combined.includes('jacket')) return JACKET_PRESET_SVG;
    if (combined.includes('helmet')) return HELMET_PRESET_SVG;
    if (combined.includes('bike')) return BIKE_PRESET_SVG;
    if (combined.includes('tshirt') || combined.includes('t-shirt') || combined.includes('shirt')) return TSHIRT_PRESET_SVG;
    return JACKET_PRESET_SVG;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Section */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Superadmin Merchandise Control Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Official Merchandise & Lifestyle Products
          </h1>
          <p className="text-sm text-indigo-200/80 mt-1 max-w-2xl">
            Manage co-branded apparel, biker jackets, aerodynamic helmets, racing sport bikes, and collectibles with dedicated stock & spec tables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMerchandise}
            disabled={loading}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-all cursor-pointer"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add Merchandise Product
          </button>
        </div>
      </div>

      {/* 2. Analytical Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Merchandise
            </span>
            <span className="text-xl font-black text-slate-900">{totalItems} Models</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cyan-50 text-cyan-600">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Stock In Hand
            </span>
            <span className="text-xl font-black text-slate-900">{totalStock.toLocaleString()} Units</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Inventory Valuation
            </span>
            <span className="text-xl font-black text-slate-900">৳{totalValuation.toLocaleString()}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Active Brands
            </span>
            <span className="text-xl font-black text-slate-900">{activeBrandCount} Brands</span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filters Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search merchandise by title, brand, or SKU..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Brand Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {distinctBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Grid / Table Mode */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Item Type Quick Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {distinctTypes.map((type) => {
          const isSelected = selectedType.toLowerCase() === type.toLowerCase();
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {type}
            </button>
          );
        })}
      </div>

      {/* 4. Content Area: Grid / Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <span className="text-xs font-mono text-slate-500 font-bold uppercase tracking-wider">
            Loading Official Merchandise Products...
          </span>
        </div>
      ) : error ? (
        <div className="p-8 rounded-3xl bg-rose-50 border border-rose-200 text-center space-y-3 max-w-lg mx-auto">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h4 className="text-sm font-bold text-rose-900">Merchandise Service Telemetry Alert</h4>
          <p className="text-xs text-rose-700">{error}</p>
          <button
            onClick={fetchMerchandise}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 px-4 text-center rounded-3xl bg-white border border-dashed border-slate-300 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              {items.length === 0 ? 'No Merchandise Products in Catalog Yet' : 'No Merchandise Matching Filters'}
            </h3>
            <p className="text-xs text-slate-500">
              {items.length === 0
                ? 'Superadmin can add official jackets, helmets, sport bikes, and apparel items with custom specs and stock quantities.'
                : 'Try adjusting your search keywords or switching filters to see other merchandise.'}
            </p>
          </div>
          {items.length === 0 && (
            <button
              onClick={() => {
                setEditingItem(null);
                setIsModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20 inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Add First Merchandise Product
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map((item) => {
            const artwork = getItemFallbackArtwork(item);
            const stock = item.stock_quantity ?? item.stockQuantity ?? 0;
            const price = item.price ?? item.base_price ?? 0;
            const type = item.item_type || item.itemType || 'Gear';
            const warranty = item.warranty_period || item.warrantyPeriod || '5-Year Guarantee';

            return (
              <div
                key={item.merchandise_id || item.merchandiseId || item.id}
                className="group rounded-3xl bg-white border border-slate-200/90 hover:border-indigo-300 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
              >
                {/* Artwork Canvas */}
                <div className="relative h-48 bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center p-4 overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
                  <img
                    src={artwork}
                    alt={item.name}
                    className="relative max-h-full max-w-full object-contain filter drop-shadow-[0_12px_16px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/20">
                      {item.brand}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/80 backdrop-blur-md text-[9px] font-bold text-white uppercase tracking-wider">
                      {type}
                    </span>
                  </div>

                  <span
                    className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                      stock > 0
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {stock > 0 ? `${stock} in stock` : 'Out of stock'}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-mono text-slate-400 font-bold tracking-wider">
                        {item.sku}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        {item.size_spec || item.sizeSpec || 'Universal'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                      {item.description || `${item.brand} co-branded ${type} in ${item.packaging}.`}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400 font-semibold">
                      <ShieldCheck className="w-3 h-3 text-blue-500" />
                      <span>{warranty}</span>
                    </div>
                  </div>

                  {/* Pricing & Footer Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Base Price
                      </span>
                      <span className="text-base font-black text-slate-900">৳{price.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setIsModalOpen(true);
                        }}
                        className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all cursor-pointer"
                        title="Edit Item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setItemToDelete(item)}
                        className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Item & Visual</th>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4">Item Type</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Spec / Sizing</th>
                  <th className="py-3 px-4">Packaging</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-right">Stock</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredItems.map((item) => {
                  const artwork = getItemFallbackArtwork(item);
                  const stock = item.stock_quantity ?? item.stockQuantity ?? 0;
                  const price = item.price ?? item.base_price ?? 0;
                  const type = item.item_type || item.itemType || 'Gear';

                  return (
                    <tr key={item.merchandise_id || item.merchandiseId || item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 p-1 flex items-center justify-center shrink-0">
                          <img src={artwork} alt="" className="w-full h-full object-contain" />
                        </div>
                        <span className="font-bold text-slate-900">{item.name}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{item.brand}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-100">
                          {type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 font-semibold">{item.sku}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{item.size_spec || item.sizeSpec || 'Universal'}</td>
                      <td className="py-3 px-4 text-slate-600">{item.packaging}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">৳{price.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {stock} Units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setItemToDelete(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Merchandise Product?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <span className="font-bold text-slate-800">{itemToDelete.name}</span> (SKU: {itemToDelete.sku}) from the catalog? This action will permanently remove it from the database entity.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Merchandise Modal */}
      <MerchandiseFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSaved={fetchMerchandise}
        initialData={editingItem}
      />
    </div>
  );
};
export default SuperadminMerchandiseCatalog;
