import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  PlusCircle,
  Package,
  ImageIcon,
  Calendar,
  Layers,
  Coins,
  Edit3,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Built-in beverage cutouts
import pepsiImg from '../../assets/img/pepsi.PNG';
import sevenUpImg from '../../assets/img/7up.PNG';
import dewImg from '../../assets/img/mountain dew.PNG';
import mirindaImg from '../../assets/img/mirinda.PNG';
import sliceImg from '../../assets/img/slice.PNG';
import aquafinaImg from '../../assets/img/aquafina.PNG';

interface Branch {
  branch_id: number;
  branch_name: string;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: () => void;
  productToEdit?: any | null;
  branches?: Branch[];
}

const DRINK_CATEGORIES = [
  'Pepsi',
  'Mirinda',
  'Slice',
  '7up',
  'Mountain Dew',
  'Sting',
  'Aquafina',
];

const CATEGORIES = [
  ...DRINK_CATEGORIES,
  'Custom',
];

const DRINK_PACKAGINGS = ['Can', 'Bottle', 'Glass Bottle', 'PET Bottle'];
const DRINK_VOLUMES = ['250ml', '400ml', '500ml', '600ml', '1L', '1.5L', '2L'];

const PRESET_IMAGES = [
  { name: 'Pepsi', src: pepsiImg, group: 'Drinks' },
  { name: '7UP', src: sevenUpImg, group: 'Drinks' },
  { name: 'Mountain Dew', src: dewImg, group: 'Drinks' },
  { name: 'Mirinda', src: mirindaImg, group: 'Drinks' },
  { name: 'Slice', src: sliceImg, group: 'Drinks' },
  { name: 'Aquafina', src: aquafinaImg, group: 'Drinks' },
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
  productToEdit,
}) => {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(productToEdit && (productToEdit.product_id || productToEdit.productId));

  const defaultExpiry = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  };

  const [category, setCategory] = useState('Pepsi');
  const [brand, setBrand] = useState('Pepsi');
  const [customBrand, setCustomBrand] = useState('');
  const [flavorVariant, setFlavorVariant] = useState('');
  const [packaging, setPackaging] = useState('Can');
  const [sizeVolume, setSizeVolume] = useState('250ml');
  const [basePrice, setBasePrice] = useState<string>('');
  const [supplierPrice, setSupplierPrice] = useState<string>('');
  const [outletPrice, setOutletPrice] = useState<string>('');
  const [retailPrice, setRetailPrice] = useState<string>('');
  const [sku, setSku] = useState('');
  const [centralStock, setCentralStock] = useState<string>('1500');
  const [expiryDate, setExpiryDate] = useState<string>(defaultExpiry());
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageMode, setImageMode] = useState<'presets' | 'upload' | 'url'>('presets');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Initialize form state when opening or when productToEdit changes
  useEffect(() => {
    if (!isOpen) return;

    if (productToEdit) {
      const cat = productToEdit.category || 'Pepsi';
      setCategory(cat);
      setBrand(productToEdit.brand || cat);
      setCustomBrand(productToEdit.brand || '');
      setFlavorVariant(productToEdit.flavor_variant || productToEdit.flavorVariant || '');
      setPackaging(productToEdit.packaging || 'Can');
      setSizeVolume(productToEdit.size_volume || productToEdit.sizeVolume || '250ml');
      setSku(productToEdit.sku || '');

      const base = productToEdit.base_price ?? productToEdit.basePrice ?? '';
      setBasePrice(String(base));

      const supp = productToEdit.supplier_price ?? productToEdit.supplierPrice ?? base;
      setSupplierPrice(String(supp));

      const out = productToEdit.outlet_price ?? productToEdit.outletPrice ?? (base ? (Number(base) * 1.15).toFixed(2) : '');
      setOutletPrice(String(out));

      const ret = productToEdit.retail_price ?? productToEdit.retailPrice ?? (out ? (Number(out) * 1.15).toFixed(2) : '');
      setRetailPrice(String(ret));

      setCentralStock(String(productToEdit.central_stock ?? productToEdit.centralStock ?? 1500));
      setExpiryDate(productToEdit.expiry_date ?? productToEdit.expiryDate ?? defaultExpiry());
      setImageUrl(productToEdit.image_url ?? productToEdit.imageUrl ?? '');
      setImageMode('presets');
      setError(null);
      setSuccessMsg(null);
    } else {
      // New product default state
      setCategory('Pepsi');
      setBrand('Pepsi');
      setCustomBrand('');
      setFlavorVariant('Regular');
      setPackaging('Can');
      setSizeVolume('250ml');
      setBasePrice('30');
      setSupplierPrice('30');
      setOutletPrice('34.50');
      setRetailPrice('39.68');
      setCentralStock('1500');
      setExpiryDate(defaultExpiry());
      setImageUrl(pepsiImg);
      setImageMode('presets');
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, productToEdit]);

  const effectiveBrand = brand === 'Custom' ? customBrand || 'Brand' : brand;

  // When base price changes, auto-calculate initial rates if not in edit mode
  const handleBasePriceChange = (val: string) => {
    setBasePrice(val);
    setSupplierPrice(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      if (!isEditing || !outletPrice) {
        const outP = (num * 1.15).toFixed(2);
        setOutletPrice(outP);
        setRetailPrice((parseFloat(outP) * 1.15).toFixed(2));
      }
    }
  };

  // Auto-derives outlet and retail rates based on custom percentage margins
  const handleRecalculateMargins = () => {
    const num = parseFloat(basePrice);
    if (!isNaN(num) && num > 0) {
      setSupplierPrice(basePrice);
      const outP = (num * 1.15).toFixed(2);
      setOutletPrice(outP);
      setRetailPrice((parseFloat(outP) * 1.15).toFixed(2));
    }
  };

  // When category changes in Create mode, adjust presets cleanly
  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    if (newCat !== 'Custom') {
      setBrand(newCat);
      if (!isEditing) {
        setPackaging('Can');
        setSizeVolume('250ml');
        setCentralStock('1500');
        setFlavorVariant('Regular');
        const match = PRESET_IMAGES.find((p) => p.name.toLowerCase() === newCat.toLowerCase());
        if (match) setImageUrl(match.src);
        setExpiryDate(defaultExpiry());
      }
    }
  };

  // Helper to re-generate standard SKU token
  const handleGenerateSku = () => {
    const brandCode = effectiveBrand.substring(0, 3).toUpperCase().replace(/\s+/g, '');
    const flavorCode = flavorVariant.substring(0, 3).toUpperCase().replace(/\s+/g, '');
    const pkgCode = packaging.substring(0, 3).toUpperCase();
    const volCode = sizeVolume.replace(/[^0-9]/g, '');
    setSku(`${brandCode || 'BEV'}-${flavorCode || 'VAR'}-${pkgCode}-${volCode || '500'}`);
  };

  // Auto-generate SKU only for new products (avoid overwriting custom SKU in edit mode)
  useEffect(() => {
    if (isEditing) return;
    if (!effectiveBrand || !flavorVariant) return;
    handleGenerateSku();
  }, [category, effectiveBrand, flavorVariant, packaging, sizeVolume, isEditing]);

  if (!isOpen) return null;

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
      setError('Base price (Supplier Buy Rate) must be a valid positive number.');
      return;
    }

    setSubmitting(true);

    try {
      const prodId = productToEdit?.product_id ?? productToEdit?.productId;
      const endpoint = isEditing
        ? `http://localhost:8080/api/products/${prodId}`
        : 'http://localhost:8080/api/products';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        brand: effectiveBrand,
        flavor_variant: flavorVariant,
        flavorVariant,
        packaging,
        size_volume: sizeVolume,
        sizeVolume,
        sku,
        base_price: priceNum,
        basePrice: priceNum,
        supplier_price: parseFloat(supplierPrice) || priceNum,
        supplierPrice: parseFloat(supplierPrice) || priceNum,
        outlet_price: parseFloat(outletPrice) || Number((priceNum * 1.15).toFixed(2)),
        outletPrice: parseFloat(outletPrice) || Number((priceNum * 1.15).toFixed(2)),
        retail_price: parseFloat(retailPrice) || Number((priceNum * 1.32).toFixed(2)),
        retailPrice: parseFloat(retailPrice) || Number((priceNum * 1.32).toFixed(2)),
        category,
        expiry_date: expiryDate,
        expiryDate: expiryDate,
        image_url: imageUrl || null,
        imageUrl: imageUrl || null,
        central_stock: parseInt(centralStock, 10) || 1500,
        centralStock: parseInt(centralStock, 10) || 1500,
      };

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `Failed to ${isEditing ? 'update' : 'create'} product.`);
      }

      setSuccessMsg(
        isEditing
          ? 'Product specifications & pricing updated successfully in database!'
          : 'Product registered successfully in database!'
      );

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isEditing
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400'
              }`}
            >
              {isEditing ? <Edit3 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-oswald text-xl font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-50">
                  {isEditing ? 'Edit Product Specifications & Pricing' : 'Input Product Details'}
                </h3>
                {isEditing && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 uppercase">
                    ID #{productToEdit?.product_id || productToEdit?.productId}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isEditing
                  ? `Modify commercial pricing, central depot stock, SKU & specs for "${effectiveBrand} ${flavorVariant}"`
                  : 'Register beverage item under brand categories with multi-tier pricing and central stock'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Category & Brand Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                Category & Brand
              </label>
              <span className="text-[10px] text-zinc-400">Select standard brand or define custom</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    category === cat
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {category === 'Custom' && (
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Enter custom brand name..."
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  required
                />
              </div>
            )}
          </div>

          {/* 2. Flavor Variant, Packaging, Size */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Flavor / Variant *
              </label>
              <input
                type="text"
                value={flavorVariant}
                onChange={(e) => setFlavorVariant(e.target.value)}
                placeholder="e.g. Regular, Zero, Diet, Black"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Packaging Format
              </label>
              <select
                value={packaging}
                onChange={(e) => setPackaging(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                {DRINK_PACKAGINGS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Drink Size / Volume
              </label>
              <select
                value={sizeVolume}
                onChange={(e) => setSizeVolume(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                {DRINK_VOLUMES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. 3-Tier Multi-Echelon Transaction Pricing */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/50 dark:bg-zinc-800/40 border border-blue-200 dark:border-zinc-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-300 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-indigo-600" />
                3-Tier Multi-Level Pricing Structure (Superadmin ➔ Supplier ➔ Outlet ➔ Customer)
              </span>
              <button
                type="button"
                onClick={handleRecalculateMargins}
                className="text-[10px] font-mono font-bold text-indigo-600 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-full border border-indigo-200 shadow-xs flex items-center gap-1 hover:bg-indigo-50 cursor-pointer"
                title="Auto-calculate 15% wholesale margin and 15% retail margin based on Buy Rate"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Auto-Calculate Margins</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tier 1: Superadmin -> Supplier */}
              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-blue-100 dark:border-zinc-800 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block mb-1">
                  Tier 1: Supplier Buy Rate
                </span>
                <span className="text-[9px] text-zinc-400 block mb-1.5">Rate charged to Regional Suppliers</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">৳</span>
                  <input
                    type="number"
                    step="0.25"
                    min="1"
                    value={basePrice}
                    onChange={(e) => handleBasePriceChange(e.target.value)}
                    required
                    placeholder="30.00"
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              </div>

              {/* Tier 2: Supplier -> Outlet */}
              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-zinc-800 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                    Tier 2: Outlet Rate
                  </span>
                  {parseFloat(outletPrice) > parseFloat(basePrice) && (
                    <span className="text-[9px] font-mono font-bold text-emerald-600">
                      +৳{(parseFloat(outletPrice) - parseFloat(basePrice)).toFixed(2)} / unit
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-zinc-400 block mb-1.5">Wholesale sell rate to franchise outlets</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">৳</span>
                  <input
                    type="number"
                    step="0.25"
                    min="1"
                    value={outletPrice}
                    onChange={(e) => setOutletPrice(e.target.value)}
                    placeholder="35.00"
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              {/* Tier 3: Outlet -> Retail Customer */}
              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-purple-100 dark:border-zinc-800 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                    Tier 3: Retail MRP
                  </span>
                  {parseFloat(retailPrice) > parseFloat(outletPrice) && (
                    <span className="text-[9px] font-mono font-bold text-emerald-600">
                      +৳{(parseFloat(retailPrice) - parseFloat(outletPrice)).toFixed(2)} / unit
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-zinc-400 block mb-1.5">End-customer counter price</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">৳</span>
                  <input
                    type="number"
                    step="0.25"
                    min="1"
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(e.target.value)}
                    placeholder="40.00"
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. SKU & Central Stock Pool */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  SKU Code *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSku}
                  className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Regenerate SKU</span>
                </button>
              </div>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. PEP-REG-CAN-250"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Superadmin Central Stock (Cases)
              </label>
              <input
                type="number"
                min="0"
                value={centralStock}
                onChange={(e) => setCentralStock(e.target.value)}
                placeholder="1500"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              <span className="text-[10px] text-zinc-400 mt-1 block">
                Total cases available in central depot for regional suppliers
              </span>
            </div>
          </div>

          {/* 5. Expiry Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
              Best Before / Expiry Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
          </div>

          {/* 6. Image Selection (Presets, Upload, or URL) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                Product Visual / Bottle Image
              </label>
              <div className="flex items-center gap-1">
                {(['presets', 'upload', 'url'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setImageMode(mode)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                      imageMode === mode
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {imageMode === 'presets' && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setImageUrl(preset.src)}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      imageUrl === preset.src
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                    }`}
                  >
                    <img src={preset.src} alt={preset.name} className="h-12 object-contain" />
                    <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
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
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl text-center hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Click to select image file from computer
                  </span>
                </button>
              </div>
            )}

            {imageMode === 'url' && (
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/item.png"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                isEditing
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'
                  : 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 shadow-indigo-500/25'
              }`}
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{isEditing ? 'Saving Changes...' : 'Registering...'}</span>
                </>
              ) : (
                <>
                  {isEditing ? <Edit3 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isEditing ? 'Save Product Changes' : 'Register Product in Database'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
