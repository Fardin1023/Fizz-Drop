import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  PlusCircle,
  Check,
  AlertCircle,
  Package,
  Warehouse,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Built-in asset cutouts
import pepsiImg from '../../assets/img/pepsi.PNG';
import sevenUpImg from '../../assets/img/7up.PNG';
import dewImg from '../../assets/img/mountain dew.PNG';
import mirindaImg from '../../assets/img/mirinda.PNG';
import sliceImg from '../../assets/img/slice.PNG';
import aquafinaImg from '../../assets/img/aquafina.PNG';

const PRESET_IMAGES = [
  { name: 'Pepsi', src: pepsiImg },
  { name: '7UP', src: sevenUpImg },
  { name: 'Mountain Dew', src: dewImg },
  { name: 'Mirinda', src: mirindaImg },
  { name: 'Slice', src: sliceImg },
  { name: 'Aquafina', src: aquafinaImg },
];

interface Branch {
  branch_id: number;
  branch_name: string;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: () => void;
  branches: Branch[];
}

const BRANDS = ['Pepsi', '7up', 'Mountain Dew', 'Mirinda', 'Sting', 'Aquafina', 'Slice', 'Coca-Cola', 'Sprite', 'Custom'];
const CATEGORIES = ['Beverage', 'Carbonated Soft Drink', 'Energy Drink', 'Purified Water', 'Fruit Juice', 'Zero Calorie'];
const PACKAGINGS = ['Bottle', 'Can', 'Glass Bottle', 'PET Bottle'];
const VOLUMES = ['250ml', '400ml', '500ml', '600ml', '1L', '1.5L', '2L'];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
  branches,
}) => {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [brand, setBrand] = useState('Pepsi');
  const [customBrand, setCustomBrand] = useState('');
  const [flavorVariant, setFlavorVariant] = useState('');
  const [category, setCategory] = useState('Carbonated Soft Drink');
  const [packaging, setPackaging] = useState('Bottle');
  const [sizeVolume, setSizeVolume] = useState('500ml');
  const [basePrice, setBasePrice] = useState<string>('');
  const [sku, setSku] = useState('');
  const [centralStock, setCentralStock] = useState<string>('1500');
  const defaultExpiry = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  };
  const [expiryDate, setExpiryDate] = useState<string>(defaultExpiry());
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageMode, setImageMode] = useState<'upload' | 'url' | 'presets'>('presets');
  const [branchStocks, setBranchStocks] = useState<Record<number, number>>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const effectiveBrand = brand === 'Custom' ? customBrand || 'Brand' : brand;

  // Auto-set preset image if brand matches
  useEffect(() => {
    if (!imageUrl) {
      const match = PRESET_IMAGES.find((p) => p.name.toLowerCase() === effectiveBrand.toLowerCase());
      if (match) {
        setImageUrl(match.src);
      }
    }
  }, [effectiveBrand]);

  // Auto-generate SKU when key fields change
  useEffect(() => {
    if (!effectiveBrand || !flavorVariant) return;
    const brandCode = effectiveBrand.substring(0, 3).toUpperCase().replace(/\s+/g, '');
    const flavorCode = flavorVariant.substring(0, 3).toUpperCase().replace(/\s+/g, '');
    const pkgCode = packaging.substring(0, 3).toUpperCase();
    const volCode = sizeVolume.replace(/[^0-9]/g, '');
    setSku(`${brandCode || 'BEV'}-${flavorCode || 'VAR'}-${pkgCode}-${volCode || '500'}`);
  }, [effectiveBrand, flavorVariant, packaging, sizeVolume]);

  if (!isOpen) return null;

  const handleStockChange = (branchId: number, val: string) => {
    const num = parseInt(val, 10);
    setBranchStocks((prev) => ({
      ...prev,
      [branchId]: isNaN(num) ? 0 : Math.max(0, num),
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!effectiveBrand.trim()) {
      setError('Please provide a valid brand name.');
      return;
    }
    if (!sku.trim()) {
      setError('SKU is required.');
      return;
    }
    const priceNum = parseFloat(basePrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Base price must be a valid positive number.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('http://localhost:8080/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          brand: effectiveBrand,
          flavor_variant: flavorVariant,
          flavorVariant,
          packaging,
          size_volume: sizeVolume,
          sizeVolume,
          sku,
          base_price: priceNum,
          basePrice: priceNum,
          category,
          expiry_date: expiryDate,
          expiryDate: expiryDate,
          image_url: imageUrl || null,
          imageUrl: imageUrl || null,
          initialStockByBranch: branchStocks,
          central_stock: parseInt(centralStock, 10) || 1500,
          total_stock: parseInt(centralStock, 10) || 1500,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create product in database.');
      }

      setSuccessMsg('Product registered successfully in database!');
      setTimeout(() => {
        onProductCreated();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Error connecting to database API');
    } finally {
      setSubmitting(false);
    }
  };

  const totalAllocatedStock = Object.values(branchStocks).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-oswald text-xl font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-50">
                Input Product Details
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Register master catalog item with custom image and branch inventory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Form: 8 cols */}
          <form onSubmit={handleSubmit} id="productForm" className="lg:col-span-8 space-y-5">
            {error && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2.5">
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Brand & Flavor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Brand Name *
                </label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  {BRANDS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                {brand === 'Custom' && (
                  <input
                    type="text"
                    value={customBrand}
                    onChange={(e) => setCustomBrand(e.target.value)}
                    placeholder="Enter custom brand"
                    className="w-full mt-2 px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Flavor / Variant *
                </label>
                <input
                  type="text"
                  value={flavorVariant}
                  onChange={(e) => setFlavorVariant(e.target.value)}
                  placeholder="e.g. Sugar, Zero, Diet, Lemon"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
            </div>

            {/* Packaging, Volume & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Packaging
                </label>
                <select
                  value={packaging}
                  onChange={(e) => setPackaging(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  {PACKAGINGS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Size / Volume
                </label>
                <select
                  value={sizeVolume}
                  onChange={(e) => setSizeVolume(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  {VOLUMES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Price & SKU */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Base Price (BDT ৳) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">৳</span>
                  <input
                    type="number"
                    step="0.50"
                    min="1"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    required
                    placeholder="45.00"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    SKU *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const brandCode = effectiveBrand.substring(0, 3).toUpperCase().replace(/\s+/g, '');
                      const flavorCode = flavorVariant.substring(0, 3).toUpperCase().replace(/\s+/g, '');
                      const pkgCode = packaging.substring(0, 3).toUpperCase();
                      const volCode = sizeVolume.replace(/[^0-9]/g, '');
                      setSku(`${brandCode || 'BEV'}-${flavorCode || 'VAR'}-${pkgCode}-${volCode || '500'}`);
                    }}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3" />
                    Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  required
                  placeholder="PEP-ZER-CAN-250"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
            </div>

            {/* Superadmin Central Fixed Stock Pool */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-indigo-600" />
                  Superadmin Central Stock Pool (Cases for Regional Suppliers) *
                </span>
                <span className="text-[10px] font-mono text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                  Default Benchmark: 1,500 cases
                </span>
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={centralStock}
                onChange={(e) => setCentralStock(e.target.value)}
                required
                placeholder="1500"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              <p className="text-[10px] text-zinc-400 mt-1">
                Stock allocated in the central inventory repository that regional suppliers can request and order.
              </p>
            </div>

            {/* Product Expiry Date Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Product Expiry Date (`expiry_date`) *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">
                Suppliers must declare the product expiration / best before date for customer safety.
              </p>
            </div>

            {/* Product Image Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-indigo-500" />
                  Product Image (`image_url`)
                </label>
                <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setImageMode('presets')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      imageMode === 'presets' ? 'bg-white dark:bg-zinc-900 text-indigo-600 font-bold shadow-xs' : 'text-zinc-500'
                    }`}
                  >
                    Presets
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode('upload')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      imageMode === 'upload' ? 'bg-white dark:bg-zinc-900 text-indigo-600 font-bold shadow-xs' : 'text-zinc-500'
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode('url')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      imageMode === 'url' ? 'bg-white dark:bg-zinc-900 text-indigo-600 font-bold shadow-xs' : 'text-zinc-500'
                    }`}
                  >
                    Image URL
                  </button>
                </div>
              </div>

              {imageMode === 'presets' && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setImageUrl(preset.src)}
                      className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        imageUrl === preset.src
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <img src={preset.src} alt={preset.name} className="h-10 w-auto object-contain" />
                      <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 truncate w-full">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {imageMode === 'upload' && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-200 dark:border-zinc-700/80 hover:border-indigo-500 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-800/40"
                  >
                    <Upload className="w-6 h-6 mx-auto text-zinc-400 mb-1" />
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                      Click to upload bottle / can image
                    </span>
                    <span className="text-[10px] text-zinc-400">PNG, JPG, SVG up to 5MB</span>
                  </div>
                </div>
              )}

              {imageMode === 'url' && (
                <div className="relative">
                  <LinkIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.example.com/drink-bottle.png"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              )}
            </div>

            {/* Outlets / Branches Inventory Allocation */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Warehouse className="w-4 h-4 text-indigo-500" />
                  Outlet Inventory Allocation (`Shop_Inventory`)
                </span>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                  Total: {totalAllocatedStock} units
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-3">
                Sets initial physical stock for each active outlet in the database.
              </p>

              {branches.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                  No outlets created yet. You can add outlets in the <strong>"Outlets & Locations"</strong> tab anytime!
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {branches.map((b) => (
                    <div key={b.branch_id} className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
                      <span className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 truncate" title={b.branch_name}>
                        {b.branch_name}
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={branchStocks[b.branch_id] ?? 0}
                        onChange={(e) => handleStockChange(b.branch_id, e.target.value)}
                        className="w-full mt-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-center text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>

          {/* Right Preview Card: 4 cols */}
          <div className="lg:col-span-4 flex flex-col items-center justify-start p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Live Catalog Preview
            </span>

            {/* Drink Card Preview */}
            <div className="w-full max-w-[240px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xl flex flex-col items-center text-center relative overflow-hidden group">
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase">
                {category}
              </div>

              {/* Product Image Preview */}
              <div className="w-28 h-32 my-2 rounded-2xl flex items-center justify-center p-2 relative">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={effectiveBrand}
                    className="max-h-full max-w-full object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <Package className="w-8 h-8 animate-pulse" />
                  </div>
                )}
              </div>

              <h4 className="font-oswald text-lg font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-tight">
                {effectiveBrand} {flavorVariant}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {sizeVolume} • {packaging}
              </p>

              <div className="mt-3 text-xs font-mono px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-300">
                {sku}
              </div>

              <div className="w-full mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[10px] text-zinc-400 uppercase block font-semibold">Price</span>
                  <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                    ৳{parseFloat(basePrice || '0').toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 uppercase block font-semibold">Stock</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {totalAllocatedStock} units
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-[11px] text-zinc-400">
                Universal audit fields: <code className="text-indigo-500">created_by: Supplier</code>, <code className="text-indigo-500">created_date: NOW()</code>
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="productForm"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Save Product to Database</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
