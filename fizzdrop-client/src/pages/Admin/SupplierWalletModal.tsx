import React, { useState, useEffect } from 'react';
import {
  Wallet,
  CreditCard,
  Building,
  Smartphone,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  Receipt,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SupplierWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletUpdated?: (newBalance: number) => void;
  requiredAmount?: number;
}

export const SupplierWalletModal: React.FC<SupplierWalletModalProps> = ({
  isOpen,
  onClose,
  onWalletUpdated,
  requiredAmount,
}) => {
  const { user } = useAuth();
  const userId = user?.user_id || 4;

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Wallet data from backend
  const [walletData, setWalletData] = useState<{
    supplier_id: number;
    business_name: string;
    wallet_balance: number;
    bank_name?: string;
    bank_account_number?: string;
    bank_account_name?: string;
    mobile_banking_number?: string;
    default_payment_method?: string;
    transactions?: any[];
  } | null>(null);

  // Form states for topup
  const [amount, setAmount] = useState<string>(
    requiredAmount ? Math.ceil(requiredAmount).toString() : '50000'
  );
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_TRANSFER');
  const [referenceCode, setReferenceCode] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Editable Banking & MFS details
  const [bankName, setBankName] = useState<string>('');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>('');
  const [bankAccountName, setBankAccountName] = useState<string>('');
  const [mobileBankingNumber, setMobileBankingNumber] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'topup' | 'settings' | 'history'>('topup');

  // Fetch live wallet details
  const fetchWallet = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/v1/supplier/wallet?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to load supplier wallet details');
      const data = await res.json();
      setWalletData(data);
      setBankName(data.bank_name || '');
      setBankAccountNumber(data.bank_account_number || '');
      setBankAccountName(data.bank_account_name || '');
      setMobileBankingNumber(data.mobile_banking_number || '');
      if (data.default_payment_method) {
        setPaymentMethod(data.default_payment_method);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWallet();
      setSuccessMsg(null);
      setErrorMsg(null);
      if (requiredAmount && requiredAmount > 0) {
        setAmount(Math.ceil(requiredAmount).toString());
      }
    }
  }, [isOpen, userId, requiredAmount]);

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid top-up deposit amount greater than 0.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const payload = {
        amount: numAmount,
        payment_method: paymentMethod,
        reference_code: referenceCode.trim() || `DEP-${Date.now().toString().slice(-6)}`,
        notes: notes.trim() || `Commercial deposit via ${paymentMethod}`,
        bank_name: bankName.trim(),
        bank_account_number: bankAccountNumber.trim(),
        bank_account_name: bankAccountName.trim(),
        mobile_banking_number: mobileBankingNumber.trim(),
      };

      const res = await fetch(`/api/v1/supplier/wallet/topup?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to deposit funds into wallet');
      }

      setSuccessMsg(`৳${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} successfully added to your Commercial Wallet!`);
      const newBalance = Number(result.wallet_balance || (walletData?.wallet_balance || 0) + numAmount);
      setWalletData((prev) => prev ? { ...prev, wallet_balance: newBalance } : null);
      if (onWalletUpdated) {
        onWalletUpdated(newBalance);
      }
      setTimeout(() => {
        fetchWallet();
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing top-up');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const payload = {
        bank_name: bankName.trim(),
        bank_account_number: bankAccountNumber.trim(),
        bank_account_name: bankAccountName.trim(),
        mobile_banking_number: mobileBankingNumber.trim(),
        default_payment_method: paymentMethod,
      };

      const res = await fetch(`/api/v1/supplier/wallet/settings?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to update wallet banking settings');
      }

      setSuccessMsg('Commercial wallet & payout accounts updated successfully!');
      fetchWallet();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving settings');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentBalance = Number(walletData?.wallet_balance || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-oswald tracking-wide flex items-center gap-2">
                COMMERCIAL WALLET & TOP-UP
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-sans px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  Verified Depot
                </span>
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                {walletData?.business_name || 'Regional Supplier Depot Operations'}
              </p>
            </div>
          </div>

          {/* Current Live Balance Card */}
          <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-300 block">
                Available Wallet Balance
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-black font-oswald text-white">
                  ৳{currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-slate-300 font-sans">BDT Credit</span>
              </div>
            </div>
            <button
              onClick={fetchWallet}
              disabled={loading}
              title="Refresh Balance"
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex gap-2 mt-4 pt-2 border-t border-white/10">
            <button
              onClick={() => setActiveTab('topup')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'topup'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Deposit & Top-up
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Bank & MFS Accounts
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Recent Transactions ({walletData?.transactions?.length || 0})
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. TOPUP TAB */}
          {activeTab === 'topup' && (
            <form onSubmit={handleTopup} className="space-y-4">
              {requiredAmount && requiredAmount > currentBalance && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Order requires <strong>৳{requiredAmount.toFixed(2)}</strong>. Current shortfall is{' '}
                      <strong>৳{(requiredAmount - currentBalance).toFixed(2)}</strong>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAmount(Math.ceil(requiredAmount - currentBalance).toString())}
                    className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded-lg text-[10px] hover:bg-amber-700 transition"
                  >
                    Set Shortfall
                  </button>
                </div>
              )}

              {/* Deposit Amount & Quick Presets */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                  Deposit Amount (৳ BDT) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-oswald text-lg">
                    ৳
                  </span>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter deposit amount"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-3 text-base font-bold font-oswald text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {['10000', '25000', '50000', '100000', '200000'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 text-xs font-semibold text-slate-600 transition-all"
                    >
                      +৳{Number(preset).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Channel */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                  Deposit Channel / Method *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'BANK_TRANSFER', label: 'Corporate Bank', icon: Building },
                    { id: 'BKASH', label: 'bKash Merchant', icon: Smartphone },
                    { id: 'NAGAD', label: 'Nagad Commercial', icon: Smartphone },
                    { id: 'CORPORATE_CARD', label: 'Debit / Card', icon: CreditCard },
                  ].map((method) => {
                    const Icon = method.icon;
                    const isSelected = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="text-[11px]">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reference / Deposit Slip Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                    Deposit Slip / Transaction Ref Code
                  </label>
                  <input
                    type="text"
                    value={referenceCode}
                    onChange={(e) => setReferenceCode(e.target.value)}
                    placeholder="e.g. TR-982348 or Bank Slip No"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                    Deposit Remarks / Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional deposit remark"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Optional Quick Account Verification Fields */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  Depot Banking Details (Saved to Profile)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Eastern Bank PLC"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      placeholder="e.g. 1041029384812"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      placeholder="e.g. Dhaka Logistics Beverage Ltd"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                      Mobile Banking No (bKash/Nagad)
                    </label>
                    <input
                      type="text"
                      value={mobileBankingNumber}
                      onChange={(e) => setMobileBankingNumber(e.target.value)}
                      placeholder="e.g. 01700112233"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-2 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Deposit...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Confirm & Deposit Funds</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* 2. SETTINGS TAB */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <p className="text-xs text-slate-500">
                Update your official commercial bank and mobile financial services (MFS) accounts for automatic stock purchasing and payment settlements.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                    Primary Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Eastern Bank PLC / BRAC Bank"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="e.g. 1041029384812"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                    Account Holder Legal Name
                  </label>
                  <input
                    type="text"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="e.g. Dhaka Central Beverage Logistics Ltd"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                    Commercial Mobile Banking (bKash/Nagad)
                  </label>
                  <input
                    type="text"
                    value={mobileBankingNumber}
                    onChange={(e) => setMobileBankingNumber(e.target.value)}
                    placeholder="e.g. +8801700112233"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-1.5">
                  Default Purchasing Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="BANK_TRANSFER">Corporate Bank Wire (RTGS / BEFTN)</option>
                  <option value="BKASH">bKash Commercial Merchant</option>
                  <option value="NAGAD">Nagad Islamic / Commercial</option>
                  <option value="CORPORATE_CARD">Corporate Visa / Mastercard</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-2 transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Wallet Details'}
                </button>
              </div>
            </form>
          )}

          {/* 3. TRANSACTION HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {(!walletData?.transactions || walletData.transactions.length === 0) ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No commercial transactions recorded yet.
                </div>
              ) : (
                walletData.transactions.map((tx: any) => {
                  const isCredit = tx.entry_type === 'CREDIT';
                  return (
                    <div
                      key={tx.id || tx.transaction_code}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isCredit
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownRight className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            <span>{tx.type?.replace(/_/g, ' ') || 'Commercial Transaction'}</span>
                            <span className="text-[10px] font-mono font-normal text-slate-400">
                              {tx.transaction_code}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {tx.description || tx.reference_code || 'Wallet transfer'}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(tx.created_at).toLocaleString()}</span>
                            {tx.payment_method && (
                              <span className="font-semibold text-slate-600">
                                • {tx.payment_method}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-oswald text-sm font-black ${
                            isCredit ? 'text-emerald-600' : 'text-slate-800'
                          }`}
                        >
                          {isCredit ? '+' : '-'}৳{Number(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          {tx.status || 'COMPLETED'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
