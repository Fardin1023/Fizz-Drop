import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  PlusCircle,
  Package,
  ImageIcon,
  Calendar,
  Layers,
  Shield,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Built-in beverage cutouts
import pepsiImg from '../../assets/img/pepsi.PNG';
import sevenUpImg from '../../assets/img/7up.PNG';
import dewImg from '../../assets/img/mountain dew.PNG';
import mirindaImg from '../../assets/img/mirinda.PNG';
import sliceImg from '../../assets/img/slice.PNG';
import aquafinaImg from '../../assets/img/aquafina.PNG';

// Built-in merchandise vector cutouts
import {
  JACKET_PRESET_SVG,
  HELMET_PRESET_SVG,
  BIKE_PRESET_SVG,
  TSHIRT_PRESET_SVG,
} from '../../assets/merchandisePresets';

interface Branch {
  branch_id: number;
  branch_name: string;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: () => void;
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
  'Merchandise',
  'Custom',
];

const DRINK_PACKAGINGS = ['Can', 'Bottle', 'Glass Bottle', 'PET Bottle'];
const DRINK_VOLUMES = ['250ml', '400ml', '500ml', '600ml', '1L', '1.5L', '2L'];

const MERCHANDISE_TYPES = ['Jackets', 'Helmets', 'Bike', 'T-Shirt', 'Custom Merchandise'];
const MERCHANDISE_PACKAGINGS = ['Boxed Packaging', 'Polybag', 'Hanger', 'Assembled Unit', 'Crated Box'];

const APPAREL_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'Universal / Free Size'];
const HELMET_SIZES = ['M (57-58cm)', 'L (59-60cm)', 'XL (61-62cm)', 'Standard'];
const BIKE_SPECS = ['150cc Sport', '250cc Racing', 'Commuter Standard', 'Electric Edition', 'Single-Speed'];

const CO_BRANDS = [
  'Pepsi',
  'Mountain Dew',
  '7up',
  'Mirinda',
  'Slice',
  'Sting',
  'Aquafina',
  'FizzDrop Official',
  'Custom',
];

const PRESET_IMAGES = [
  { name: 'Pepsi', src: pepsiImg, group: 'Drinks' },
  { name: '7UP', src: sevenUpImg, group: 'Drinks' },
  { name: 'Mountain Dew', src: dewImg, group: 'Drinks' },
  { name: 'Mirinda', src: mirindaImg, group: 'Drinks' },
  { name: 'Slice', src: sliceImg, group: 'Drinks' },
  { name: 'Aquafina', src: aquafinaImg, group: 'Drinks' },
  { name: 'Jackets', src: JACKET_PRESET_SVG, group: 'Merchandise' },
  { name: 'Helmets', src: HELMET_PRESET_SVG, group: 'Merchandise' },
  { name: 'Bike', src: BIKE_PRESET_SVG, group: 'Merchandise' },
  { name: 'T-Shirt', src: TSHIRT_PRESET_SVG, group: 'Merchandise' },
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
}) => {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState('Pepsi');
  const [merchandiseType, setMerchandiseType] = useState('Jackets');
  const [brand, setBrand] = useState('Pepsi');
  const [customBrand, setCustomBrand] = useState('');
  const [flavorVariant, setFlavorVariant] = useState('');
  const [packaging, setPackaging] = useState('Can');
  const [sizeVolume, setSizeVolume] = useState('250ml');
  const [basePrice, setBasePrice] = useState<string>('');
  const [sku, setSku] = useState('');
  const [centralStock, setCentralStock] = useState<string>('1500');

  const isMerchandise = category === 'Merchandise';

  const defaultExpiry = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + (isMerchandise ? 5 : 1));
    return d.toISOString().split('T')[0];
  };

  const [expiryDate, setExpiryDate] = useState<string>(defaultExpiry());
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageMode, setImageMode] = useState<'presets' | 'upload' | 'url'>('presets');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const effectiveBrand = brand === 'Custom' ? customBrand || 'Brand' : brand;

  // Whenever category changes, adjust defaults cleanly
  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    if (newCat === 'Merchandise') {
      setBrand('Pepsi');
      setMerchandiseType('Jackets');
      setPackaging('Boxed Packaging');
      setSizeVolume('L');
      setCentralStock('200');
      setImageUrl(JACKET_PRESET_SVG);
      setFlavorVariant('Biker Leather Edition');
      const d = new Date();
      d.setFullYear(d.getFullYear() + 5);
      setExpiryDate(d.toISOString().split('T')[0]);
    } else if (newCat !== 'Custom') {
      setBrand(newCat);
      setPackaging('Can');
      setSizeVolume('250ml');
      setCentralStock('1500');
      setFlavorVariant('Zero Sugar');
      const match = PRESET_IMAGES.find((p) => p.name.toLowerCase() === newCat.toLowerCase());
      if (match) setImageUrl(match.src);
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      setExpiryDate(d.toISOString().split('T')[0]);
    }
  };

  // Handle merchandise type changes
  const handleMerchandiseTypeChange = (type: string) => {
    setMerchandiseType(type);
    if (type === 'Jackets') {
      setImageUrl(JACKET_PRESET_SVG);
      setPackaging('Boxed Packaging');
      setSizeVolume('L');
      setFlavorVariant('Biker Leather Edition');
    } else if (type === 'Helmets') {
      setImageUrl(HELMET_PRESET_SVG);
      setPackaging('Boxed Packaging');
      setSizeVolume('Standard');
      setFlavorVariant('Aero Full-Face Racing');
    } else if (type === 'Bike') {
      setImageUrl(BIKE_PRESET_SVG);
      setPackaging('Assembled Unit');
      setSizeVolume('150cc Sport');
      setFlavorVariant('Nitro Sport Edition');
    } else if (type === 'T-Shirt') {
      setImageUrl(TSHIRT_PRESET_SVG);
      setPackaging('Polybag');
      setSizeVolume('L');
      setFlavorVariant('Crewneck Graphic Print');
    }
  };

  // Auto-generate SKU
  useEffect(() => {
    if (!effectiveBrand || !flavorVariant) return;
    if (isMerchandise) {
      const typeCode = merchandiseType.substring(0, 3).toUpperCase();
      const brandCode = effectiveBrand.substring(0, 3).toUpperCase().replace(/\s+/g, '');
      const sizeCode = sizeVolume.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
      setSku(`MER-${typeCode || 'ITM'}-${brandCode || 'BRD'}-${sizeCode || 'STD'}`);
    } else {
      const brandCode = effectiveBrand.substring(0, 3).toUpperCase().replace(/\s+/g, '');
      const flavorCode = flavorVariant.substring(0, 3).toUpperCase().replace(/\s+/g, '');
      const pkgCode = packaging.substring(0, 3).toUpperCase();
      const volCode = sizeVolume.replace(/[^0-9]/g, '');
      setSku(`${brandCode || 'BEV'}-${flavorCode || 'VAR'}-${pkgCode}-${volCode || '500'}`);
    }
  }, [category, merchandiseType, effectiveBrand, flavorVariant, packaging, sizeVolume]);

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
          central_stock: parseInt(centralStock, 10) || (isMerchandise ? 200 : 1500),
          total_stock: 0,
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isMerchandise
                ? 'bg-purple-600/10 text-purple-600 dark:text-purple-400'
                : 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400'
            }`}>
              {isMerchandise ? <ShoppingBag className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-oswald text-xl font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-50">
                Input Product Details
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isMerchandise
                  ? 'Register official merchandise (Jackets, Helmets, Bike, T-Shirt) into master database'
                  : 'Register beverage item under brand categories (Pepsi, Mirinda, Slice, etc.) with packaging options'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
              <span className="font-bold">Success:</span> {successMsg}
            </div>
          )}

          {/* Primary Category Selector Header */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-zinc-800/40 dark:to-zinc-800/20 border border-slate-200 dark:border-zinc-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                Select Product Category *
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isMerchandise
                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                  : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}>
                {isMerchandise ? 'Merchandise Mode' : 'Drink Category'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-1">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-center ${
                      isSelected
                        ? cat === 'Merchandise'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/25'
                          : 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25'
                        : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-slate-200 dark:border-zinc-700 hover:border-blue-400'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Category Specific Subcategories */}
          {isMerchandise ? (
            /* Merchandise Subcategory Block */
            <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-purple-600" />
                  Merchandise Item Category (Jackets, Helmets, Bike, T-Shirt) *
                </span>
                <span className="text-[10px] font-semibold text-purple-600">Official Gear</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MERCHANDISE_TYPES.map((type) => {
                  const isSelected = merchandiseType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleMerchandiseTypeChange(type)}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-md shadow-purple-500/25'
                          : 'bg-white dark:bg-zinc-800 text-purple-900 dark:text-zinc-200 border-purple-200 dark:border-zinc-700 hover:bg-purple-100/50'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Co-Brand / Official Crest *
                  </label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  >
                    {CO_BRANDS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Design / Edition / Model *
                  </label>
                  <input
                    type="text"
                    value={flavorVariant}
                    onChange={(e) => setFlavorVariant(e.target.value)}
                    placeholder="e.g. Biker Leather Edition, Aero Full-Face, 150cc Sport"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Drink Brand & Flavor Block */
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
                  {DRINK_CATEGORIES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value="Coca-Cola">Coca-Cola</option>
                  <option value="Sprite">Sprite</option>
                  <option value="Custom">Custom Brand</option>
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
                  placeholder="e.g. Regular Cola, Zero Sugar, Citrus Blast, Mango"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
            </div>
          )}

          {/* Packaging & Size/Volume (Subcategory Specifications) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                {isMerchandise ? 'Merchandise Packaging / Presentation' : 'Drink Packaging Format (Can, Bottle, Glass Bottle) *'}
              </label>
              <select
                value={packaging}
                onChange={(e) => setPackaging(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                {(isMerchandise ? MERCHANDISE_PACKAGINGS : DRINK_PACKAGINGS).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                {isMerchandise ? 'Size / Specification' : 'Drink Size / Volume'}
              </label>
              <select
                value={sizeVolume}
                onChange={(e) => setSizeVolume(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                {isMerchandise ? (
                  merchandiseType === 'Bike' ? (
                    BIKE_SPECS.map((v) => <option key={v} value={v}>{v}</option>)
                  ) : merchandiseType === 'Helmets' ? (
                    HELMET_SIZES.map((v) => <option key={v} value={v}>{v}</option>)
                  ) : (
                    APPAREL_SIZES.map((v) => <option key={v} value={v}>{v}</option>)
                  )
                ) : (
                  DRINK_VOLUMES.map((v) => <option key={v} value={v}>{v}</option>)
                )}
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
                  placeholder={isMerchandise ? '1500.00' : '45.00'}
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
                    if (isMerchandise) {
                      const typeCode = merchandiseType.substring(0, 3).toUpperCase();
                      const brandCode = effectiveBrand.substring(0, 3).toUpperCase().replace(/\s+/g, '');
                      const sizeCode = sizeVolume.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
                      setSku(`MER-${typeCode || 'ITM'}-${brandCode || 'BRD'}-${sizeCode || 'STD'}`);
                    } else {
                      const brandCode = effectiveBrand.substring(0, 3).toUpperCase().replace(/\s+/g, '');
                      const flavorCode = flavorVariant.substring(0, 3).toUpperCase().replace(/\s+/g, '');
                      const pkgCode = packaging.substring(0, 3).toUpperCase();
                      const volCode = sizeVolume.replace(/[^0-9]/g, '');
                      setSku(`${brandCode || 'BEV'}-${flavorCode || 'VAR'}-${pkgCode}-${volCode || '500'}`);
                    }
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
                placeholder={isMerchandise ? 'MER-JAC-PEP-L' : 'PEP-ZER-CAN-250'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
          </div>

          {/* Superadmin Central Fixed Stock Pool */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-indigo-600" />
                Superadmin Central Stock Pool (Units for Regional Logistics) *
              </span>
              <span className="text-[10px] font-mono text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                Default Benchmark: {isMerchandise ? '200 units' : '1,500 cases'}
              </span>
            </label>
            <input
              type="number"
              min="0"
              step={isMerchandise ? '10' : '50'}
              value={centralStock}
              onChange={(e) => setCentralStock(e.target.value)}
              required
              placeholder={isMerchandise ? '200' : '1500'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            <p className="text-[10px] text-zinc-400 mt-1">
              Stock reserved in central inventory warehouse for regional suppliers to requisition.
            </p>
          </div>

          {/* Expiry Date / Quality Guarantee */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              {isMerchandise ? 'Quality Assurance / Warranty Date' : 'Product Expiry Date (`expiry_date`) *'}
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            <p className="text-[10px] text-zinc-400 mt-1">
              {isMerchandise
                ? 'Official durable merchandise items default to a 5-year quality warranty date.'
                : 'Perishable beverage products require accurate expiry dates for retail compliance.'}
            </p>
          </div>

          {/* Product Image Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-500" />
                Product Image Artwork
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
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setImageUrl(preset.src)}
                      className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        imageUrl === preset.src
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <img src={preset.src} alt={preset.name} className="h-12 w-auto object-contain" />
                      <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 truncate w-full">
                        {preset.name}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-mono">
                        {preset.group}
                      </span>
                    </button>
                  ))}
                </div>
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
                  {imageUrl ? (
                    <div className="flex items-center justify-center gap-3">
                      <img src={imageUrl} alt="Preview" className="h-16 w-16 object-contain rounded-xl border p-1" />
                      <div className="text-left text-xs">
                        <p className="font-semibold text-emerald-600">File Loaded Successfully</p>
                        <p className="text-[10px] text-zinc-400">Click to replace file</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      Click to choose an image file (PNG, JPG, SVG up to 5MB)
                    </p>
                  )}
                </div>
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
              className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                isMerchandise
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/25'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'
              }`}
            >
              {submitting ? 'Registering...' : isMerchandise ? 'Register Merchandise Item' : 'Register Product in Database'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default ProductFormModal;
