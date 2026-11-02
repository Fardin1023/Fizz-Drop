import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Tag,
  Layers,
  ShieldCheck,
  Package,
  Image as ImageIcon,
  DollarSign,
  Boxes,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  JACKET_PRESET_SVG,
  HELMET_PRESET_SVG,
  BIKE_PRESET_SVG,
  TSHIRT_PRESET_SVG,
  MERCHANDISE_PRESETS,
} from '../../assets/merchandisePresets';

export interface MerchandiseItem {
  merchandise_id?: number;
  merchandiseId?: number;
  id?: number;
  brand: string;
  item_type: string;
  itemType?: string;
  name: string;
  sku: string;
  size_spec: string;
  sizeSpec?: string;
  packaging: string;
  price: number;
  base_price?: number;
  stock_quantity: number;
  stockQuantity?: number;
  description?: string;
  image_url?: string;
  imageUrl?: string;
  warranty_period?: string;
  warrantyPeriod?: string;
  status?: string;
}

interface MerchandiseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: MerchandiseItem | null;
}

const BRAND_OPTIONS = [
  'Pepsi',
  'Mountain Dew',
  '7up',
  'Mirinda',
  'Slice',
  'Sting',
  'Aquafina',
  'FizzDrop Official',
];

const ITEM_TYPES = [
  'Jackets',
  'Helmets',
  'Bike',
  'T-Shirt',
  'Caps',
  'Accessories',
  'Custom',
];

const PACKAGING_OPTIONS = [
  'Boxed Packaging',
  'Polybag',
  'Assembled Unit',
  'Hanger',
  'Crated Box',
  'Custom',
];

const SIZE_PRESETS = ['S', 'M', 'L', 'XL', 'XXL', 'Universal', '150cc', '250cc'];

export const MerchandiseFormModal: React.FC<MerchandiseFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialData,
}) => {
  const [brand, setBrand] = useState('Pepsi');
  const [customBrand, setCustomBrand] = useState('');
  const [itemType, setItemType] = useState('Jackets');
  const [customType, setCustomType] = useState('');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [isManualSku, setIsManualSku] = useState(false);
  const [sizeSpec, setSizeSpec] = useState('XL');
  const [packaging, setPackaging] = useState('Boxed Packaging');
  const [customPackaging, setCustomPackaging] = useState('');
  const [price, setPrice] = useState('3500');
  const [stockQuantity, setStockQuantity] = useState('100');
  const [description, setDescription] = useState('');
  const [warrantyPeriod, setWarrantyPeriod] = useState('5-Year Quality Guarantee');
  const [status, setStatus] = useState('Active');
  const [imageUrl, setImageUrl] = useState(JACKET_PRESET_SVG);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto SKU generator helper
  const generateSku = (b: string, t: string, s: string) => {
    const brandCode = (b || 'PEP').slice(0, 3).toUpperCase();
    const typeCode = (t || 'JAC').slice(0, 3).toUpperCase();
    const cleanSize = (s || 'STD').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
    return `MER-${typeCode}-${brandCode}-${cleanSize}`;
  };

  useEffect(() => {
    if (initialData) {
      const activeBrand = initialData.brand || 'Pepsi';
      if (BRAND_OPTIONS.includes(activeBrand)) {
        setBrand(activeBrand);
        setCustomBrand('');
      } else {
        setBrand('Custom');
        setCustomBrand(activeBrand);
      }

      const activeType = initialData.item_type || initialData.itemType || 'Jackets';
      if (ITEM_TYPES.includes(activeType)) {
        setItemType(activeType);
        setCustomType('');
      } else {
        setItemType('Custom');
        setCustomType(activeType);
      }

      setName(initialData.name || '');
      setSku(initialData.sku || '');
      setIsManualSku(true);
      setSizeSpec(initialData.size_spec || initialData.sizeSpec || 'XL');

      const pkg = initialData.packaging || 'Boxed Packaging';
      if (PACKAGING_OPTIONS.includes(pkg)) {
        setPackaging(pkg);
        setCustomPackaging('');
      } else {
        setPackaging('Custom');
        setCustomPackaging(pkg);
      }

      setPrice(String(initialData.price ?? initialData.base_price ?? '3500'));
      setStockQuantity(String(initialData.stock_quantity ?? initialData.stockQuantity ?? '100'));
      setDescription(initialData.description || '');
      setWarrantyPeriod(initialData.warranty_period || initialData.warrantyPeriod || '5-Year Quality Guarantee');
      setStatus(initialData.status || 'Active');
      setImageUrl(initialData.image_url || initialData.imageUrl || JACKET_PRESET_SVG);
    } else {
      // Default new merchandise form
      setBrand('Pepsi');
      setCustomBrand('');
      setItemType('Jackets');
      setCustomType('');
      setName('Pepsi Pro Racing Biker Jacket');
      setSizeSpec('XL');
      setPackaging('Boxed Packaging');
      setCustomPackaging('');
      setPrice('3500');
      setStockQuantity('150');
      setDescription('Official licensed premium co-branded apparel with windproof thermal insulation.');
      setWarrantyPeriod('5-Year Quality Guarantee');
      setStatus('Active');
      setImageUrl(JACKET_PRESET_SVG);
      setSku('MER-JAC-PEP-XL');
      setIsManualSku(false);
    }
    setError(null);
    setSuccessMsg(null);
  }, [initialData, isOpen]);

  // Sync SKU & preset image when brand or type changes in create mode
  const handleTypeChange = (newType: string) => {
    setItemType(newType);
    if (!initialData) {
      if (newType === 'Jackets') {
        setImageUrl(JACKET_PRESET_SVG);
        setName(`${brand === 'Custom' ? customBrand || 'FizzDrop' : brand} Pro Racing Jacket`);
        setSizeSpec('XL');
        setPackaging('Boxed Packaging');
        setPrice('3500');
      } else if (newType === 'Helmets') {
        setImageUrl(HELMET_PRESET_SVG);
        setName(`${brand === 'Custom' ? customBrand || 'FizzDrop' : brand} Aero Motocross Helmet`);
        setSizeSpec('Universal');
        setPackaging('Boxed Packaging');
        setPrice('2200');
      } else if (newType === 'Bike') {
        setImageUrl(BIKE_PRESET_SVG);
        setName(`${brand === 'Custom' ? customBrand || 'FizzDrop' : brand} Nitro Sport Edition Bike`);
        setSizeSpec('150cc');
        setPackaging('Assembled Unit');
        setPrice('185000');
      } else if (newType === 'T-Shirt') {
        setImageUrl(TSHIRT_PRESET_SVG);
        setName(`${brand === 'Custom' ? customBrand || 'FizzDrop' : brand} Streetwear Graphic T-Shirt`);
        setSizeSpec('L');
        setPackaging('Polybag');
        setPrice('650');
      }
      if (!isManualSku) {
        const resolvedBrand = brand === 'Custom' ? customBrand || 'GEN' : brand;
        const resolvedType = newType === 'Custom' ? customType || 'MER' : newType;
        setSku(generateSku(resolvedBrand, resolvedType, sizeSpec));
      }
    }
  };

  const handleBrandChange = (newBrand: string) => {
    setBrand(newBrand);
    if (!initialData) {
      const brandLabel = newBrand === 'Custom' ? customBrand || 'Brand' : newBrand;
      setName(`${brandLabel} ${itemType === 'Custom' ? customType || 'Gear' : itemType}`);
      if (!isManualSku) {
        const resolvedType = itemType === 'Custom' ? customType || 'MER' : itemType;
        setSku(generateSku(brandLabel, resolvedType, sizeSpec));
      }
    }
  };

  const handleSizeChange = (s: string) => {
    setSizeSpec(s);
    if (!isManualSku && !initialData) {
      const resolvedBrand = brand === 'Custom' ? customBrand || 'GEN' : brand;
      const resolvedType = itemType === 'Custom' ? customType || 'MER' : itemType;
      setSku(generateSku(resolvedBrand, resolvedType, s));
    }
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError('File is too large. Please select an image under 20MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const resolvedBrand = (brand === 'Custom' ? customBrand : brand).trim();
    const resolvedType = (itemType === 'Custom' ? customType : itemType).trim();
    const resolvedPackaging = (packaging === 'Custom' ? customPackaging : packaging).trim();
    const numPrice = parseFloat(price);
    const numStock = parseInt(stockQuantity, 10);

    if (!resolvedBrand) {
      setError('Brand name is required.');
      setLoading(false);
      return;
    }
    if (!resolvedType) {
      setError('Item type is required.');
      setLoading(false);
      return;
    }
    if (!name.trim()) {
      setError('Merchandise title/name is required.');
      setLoading(false);
      return;
    }
    if (!sku.trim()) {
      setError('SKU is required.');
      setLoading(false);
      return;
    }
    if (isNaN(numPrice) || numPrice <= 0) {
      setError('Please provide a valid price greater than 0.');
      setLoading(false);
      return;
    }

    const payload = {
      brand: resolvedBrand,
      item_type: resolvedType,
      itemType: resolvedType,
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      size_spec: sizeSpec.trim(),
      sizeSpec: sizeSpec.trim(),
      packaging: resolvedPackaging || 'Boxed Packaging',
      price: numPrice,
      base_price: numPrice,
      stock_quantity: isNaN(numStock) ? 0 : Math.max(0, numStock),
      stockQuantity: isNaN(numStock) ? 0 : Math.max(0, numStock),
      description: description.trim(),
      image_url: imageUrl,
      imageUrl: imageUrl,
      warranty_period: warrantyPeriod.trim(),
      warrantyPeriod: warrantyPeriod.trim(),
      status: status,
    };

    try {
      const editId = initialData?.merchandise_id || initialData?.merchandiseId || initialData?.id;
      const endpoint = editId
        ? `http://localhost:8080/api/merchandise/${editId}`
        : 'http://localhost:8080/api/merchandise';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Server returned ${res.status}: ${res.statusText}`);
      }

      setSuccessMsg(editId ? 'Merchandise item updated successfully!' : 'New merchandise product added to catalog!');
      setTimeout(() => {
        onSaved();
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Failed to save merchandise product.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {initialData ? 'Edit Merchandise Product' : 'Add New Merchandise Product'}
              </h3>
              <p className="text-xs text-indigo-200/80">
                Official lifestyle apparel, riding gear, and brand collectibles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Row 1: Item Type & Brand Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                Merchandise Item Type *
              </label>
              <select
                value={itemType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {itemType === 'Custom' && (
                <input
                  type="text"
                  placeholder="Enter custom item type (e.g. Backpack, Hoodie)"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Brand / Co-Branding *
              </label>
              <select
                value={brand}
                onChange={(e) => handleBrandChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                {BRAND_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                <option value="Custom">Custom Brand...</option>
              </select>
              {brand === 'Custom' && (
                <input
                  type="text"
                  placeholder="Enter brand name"
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              )}
            </div>
          </div>

          {/* Row 2: Product Title & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Merchandise Title / Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pepsi Racing Bomber Leather Jacket"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  SKU Code *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const resolvedBrand = brand === 'Custom' ? customBrand || 'GEN' : brand;
                    const resolvedType = itemType === 'Custom' ? customType || 'MER' : itemType;
                    setSku(generateSku(resolvedBrand, resolvedType, sizeSpec));
                    setIsManualSku(false);
                  }}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Auto
                </button>
              </div>
              <input
                type="text"
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value);
                  setIsManualSku(true);
                }}
                placeholder="MER-JAC-PEP-XL"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase shadow-sm"
                required
              />
            </div>
          </div>

          {/* Row 3: Sizing & Packaging */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Size / Technical Specification *
              </label>
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {SIZE_PRESETS.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleSizeChange(sz)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      sizeSpec === sz
                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={sizeSpec}
                onChange={(e) => handleSizeChange(e.target.value)}
                placeholder="Enter size or spec"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-indigo-600" />
                Packaging Format *
              </label>
              <select
                value={packaging}
                onChange={(e) => setPackaging(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                {PACKAGING_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {packaging === 'Custom' && (
                <input
                  type="text"
                  placeholder="Enter packaging format"
                  value={customPackaging}
                  onChange={(e) => setCustomPackaging(e.target.value)}
                  className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              )}
            </div>
          </div>

          {/* Row 4: Pricing, Stock, Warranty, Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Base Price (৳) *
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="3500.00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                Stock Quantity *
              </label>
              <input
                type="number"
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="100"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Warranty Period
              </label>
              <input
                type="text"
                value={warrantyPeriod}
                onChange={(e) => setWarrantyPeriod(e.target.value)}
                placeholder="5-Year Guarantee"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Item Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="Active">Active</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="Discontinued">Discontinued</option>
              </select>
            </div>
          </div>

          {/* Row 5: Preset Visuals & Image Preview */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                Product Visual Artwork & Presets
              </span>
              <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shadow-sm">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {MERCHANDISE_PRESETS.map((p) => {
                const isSelected = imageUrl === p.src;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setImageUrl(p.src)}
                    className={`p-2 rounded-xl border transition-all text-left flex flex-col items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-200'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center p-1 overflow-hidden">
                      <img src={p.src} alt={p.name} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 truncate w-full text-center">
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Current Image Preview */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-inner">
                {imageUrl ? (
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-slate-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-[11px] font-bold text-slate-800">
                  Visual Resource Configured
                </span>
                <span className="block text-[10px] font-mono text-slate-400 truncate">
                  {imageUrl.startsWith('data:') ? 'Vector preset illustration embedded' : imageUrl}
                </span>
              </div>
            </div>
          </div>

          {/* Row 6: Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Description / Materials & Specifications
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Crafted from genuine grade leather with embossed team badges and heavy-duty stormproof zippers."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Saving Product...
                </>
              ) : initialData ? (
                'Save Changes'
              ) : (
                'Create Merchandise Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default MerchandiseFormModal;
