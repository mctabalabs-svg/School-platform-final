import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Search,
  Receipt,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Building,
  User,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { FeeAccountItem, PaymentRecordItem } from '../types';

export function FeePaymentsView() {
  const [feeAccounts, setFeeAccounts] = useState<FeeAccountItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PARTIAL' | 'CLEARED'>('ALL');

  // Active user / Parent session state
  const [userRole, setUserRole] = useState<'parent' | 'super_admin' | 'accountant'>('parent');
  const [parentName, setParentName] = useState('Carlos Martinez');
  const [parentPhone, setParentPhone] = useState('254708374149');
  const [authToken, setAuthToken] = useState<string>('');

  // STK Push Dialog State
  const [selectedStudentForPay, setSelectedStudentForPay] = useState<FeeAccountItem | null>(null);
  const [payAmount, setPayAmount] = useState<string>('15000');
  const [inputPhone, setInputPhone] = useState<string>('254708374149');
  const [isSubmittingStk, setIsSubmittingStk] = useState(false);
  const [stkFeedback, setStkFeedback] = useState<{
    success: boolean;
    message: string;
    checkoutRequestId?: string;
    simulated?: boolean;
  } | null>(null);

  // Live Phone USSD Simulation Drawer / State
  const [activeCheckoutId, setActiveCheckoutId] = useState<string | null>(null);
  const [isSimulatingCallback, setIsSimulatingCallback] = useState(false);
  const [simulatedPin, setSimulatedPin] = useState('••••');
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecordItem | null>(null);

  // Fetch token and initial data
  useEffect(() => {
    fetchAuthToken();
    fetchFeeData();
  }, [userRole]);

  const fetchAuthToken = async () => {
    try {
      const res = await fetch('/api/auth/demo-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: userRole,
          name: userRole === 'parent' ? parentName : 'Financial Controller (Bursar Office)',
        }),
      });
      const data = await res.json();
      if (data.token) {
        setAuthToken(data.token);
      }
    } catch (e) {
      console.error('Error getting auth token:', e);
    }
  };

  const fetchFeeData = async () => {
    setLoading(true);
    try {
      const [feeRes, payRes] = await Promise.all([
        fetch('/api/payments/fee-accounts'),
        fetch('/api/payments/history'),
      ]);

      if (feeRes.ok) {
        const feeData = await feeRes.json();
        setFeeAccounts(feeData.fee_accounts || []);
      }

      if (payRes.ok) {
        const payData = await payRes.json();
        setPayments(payData.payments || []);
      }
    } catch (err) {
      console.error('Failed to load fee accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayment = (account: FeeAccountItem) => {
    setSelectedStudentForPay(account);
    const balanceNum = Number(account.balance) || 0;
    setPayAmount(balanceNum > 0 ? String(balanceNum) : '10000');
    setInputPhone(account.guardian_phone.replace(/[^0-9]/g, '') || parentPhone);
    setStkFeedback(null);
    setActiveCheckoutId(null);
  };

  const handleTriggerStkPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForPay) return;

    setIsSubmittingStk(true);
    setStkFeedback(null);

    try {
      const response = await fetch('/api/payments/stk-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          student_id: selectedStudentForPay.student_id,
          amount: Number(payAmount),
          phone_number: inputPhone,
          account_reference: selectedStudentForPay.account_number,
          term_id: selectedStudentForPay.term_id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to dispatch STK push.');
      }

      setStkFeedback({
        success: true,
        message: result.message || 'STK Push prompt sent to handset successfully.',
        checkoutRequestId: result.checkout_request_id,
        simulated: result.simulated,
      });

      setActiveCheckoutId(result.checkout_request_id);
      fetchFeeData();
    } catch (err: any) {
      setStkFeedback({
        success: false,
        message: err.message,
      });
    } finally {
      setIsSubmittingStk(false);
    }
  };

  const handleSimulatePinAction = async (action: 'approve' | 'cancel') => {
    if (!activeCheckoutId) return;
    setIsSimulatingCallback(true);

    try {
      const res = await fetch('/api/payments/simulate-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkout_request_id: activeCheckoutId,
          action,
          amount: Number(payAmount),
          phone_number: inputPhone,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        // Refetch fee accounts and transactions
        await fetchFeeData();
        if (action === 'approve') {
          setTimeout(() => {
            setSelectedStudentForPay(null);
            setActiveCheckoutId(null);
          }, 1800);
        }
      }
    } catch (err) {
      console.error('Error simulating callback:', err);
    } finally {
      setIsSimulatingCallback(false);
    }
  };

  // Metrics computation
  const totalBilled = feeAccounts.reduce((sum, acc) => sum + Number(acc.total_billed || 0), 0);
  const totalPaid = feeAccounts.reduce((sum, acc) => sum + Number(acc.amount_paid || 0), 0);
  const totalOutstanding = feeAccounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
  const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  const filteredAccounts = feeAccounts.filter((acc) => {
    const matchesSearch =
      `${acc.first_name} ${acc.last_name} ${acc.student_code} ${acc.account_number}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || acc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Safaricom Daraja Status Bar */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Safaricom Daraja API Active
            </span>
            <span className="text-xs font-medium text-slate-500">PayBill Shortcode: 174379 (Sandbox)</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            M-Pesa Real-Time School Fee Settlements
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Automated LipanaM-PesaOnline STK Push, webhook callbacks, and ledger reconciliation.
          </p>
        </div>

        {/* Parent / Role Tester Controller */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-600">Simulated Role:</span>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as any)}
              className="text-xs font-semibold bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="parent">Parent: Carlos Martinez (Sophia's Guardian)</option>
              <option value="accountant">Financial Bursar (Accountant)</option>
              <option value="super_admin">Super Administrator</option>
            </select>
          </div>

          <button
            onClick={fetchFeeData}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-colors"
            title="Refresh Fee Ledgers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Financial Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Billed Fees</span>
            <Building className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            KES {totalBilled.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">Fall Term 2025 Standard Invoices</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">M-Pesa Collected</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            KES {totalPaid.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
              {collectionRate}%
            </span>
            <span className="text-xs text-slate-500">of billed accounts paid</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Outstanding Balance</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">
            KES {totalOutstanding.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">Across pending & partial accounts</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">M-Pesa Receipts</span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{payments.length}</div>
          <p className="text-xs text-slate-500 mt-1">Verified transaction records</p>
        </div>
      </div>

      {/* Main Fee Management Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Filters & Search */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student, student ID, or account number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Filter:</span>
            {(['ALL', 'PENDING', 'PARTIAL', 'CLEARED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Student Fee Accounts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Student & Guardian</th>
                <th className="py-3.5 px-4">Fee Account #</th>
                <th className="py-3.5 px-4">Fee Structure</th>
                <th className="py-3.5 px-4 text-right">Billed (KES)</th>
                <th className="py-3.5 px-4 text-right">Paid (KES)</th>
                <th className="py-3.5 px-4 text-right">Balance (KES)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Loading real-time fee balances...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No fee accounts match the specified criteria.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => {
                  const balanceNum = Number(account.balance) || 0;
                  const isCleared = account.status === 'CLEARED' || balanceNum <= 0;

                  return (
                    <tr key={account.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              account.avatar_url ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                            }
                            alt={account.first_name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="font-semibold text-slate-900">
                              {account.first_name} {account.last_name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {account.student_code} • {account.grade}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              Guardian: {account.guardian_name} ({account.guardian_phone})
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                          {account.account_number}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-xs font-medium text-slate-700">
                          {account.fee_structure_name}
                        </div>
                        <div className="text-[11px] text-slate-400">Due: {account.due_date || '2026-09-15'}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                        {Number(account.total_billed).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-emerald-600">
                        {Number(account.amount_paid).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        <span className={balanceNum > 0 ? 'text-amber-600' : 'text-slate-400'}>
                          {balanceNum.toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            account.status === 'CLEARED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : account.status === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {account.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenPayment(account)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isCleared
                              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          }`}
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>{isCleared ? 'Top-Up' : 'Pay M-Pesa'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* M-Pesa Payment Receipts Ledger */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">M-Pesa Payment Receipts & Audit Trail</h3>
          </div>
          <span className="text-xs text-slate-500">{payments.length} verified transactions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4 text-right">Amount (KES)</th>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No payment records in ledger.
                  </td>
                </tr>
              ) : (
                payments.slice(0, 8).map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {pay.mpesa_receipt_number || 'PENDING'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {pay.first_name ? `${pay.first_name} ${pay.last_name}` : `Student (${pay.student_id})`}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{pay.parent_phone}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      KES {Number(pay.amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {new Date(pay.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          pay.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : pay.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {pay.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedReceipt(pay)}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        View Slip
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* M-PESA STK PUSH DIALOG MODAL */}
      {/* ========================================================================= */}
      {selectedStudentForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-emerald-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">M-Pesa STK Push Settlement</h3>
                  <p className="text-xs text-emerald-100">Safaricom Daraja Automated Checkout</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForPay(null)}
                className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-800/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Student Fee Card Preview */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Beneficiary Student</div>
                    <div className="font-bold text-slate-900 text-base">
                      {selectedStudentForPay.first_name} {selectedStudentForPay.last_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      ID: {selectedStudentForPay.student_code} • {selectedStudentForPay.grade}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 font-medium">Current Balance</div>
                    <div className="font-bold text-amber-600 text-lg">
                      KES {Number(selectedStudentForPay.balance).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {!activeCheckoutId ? (
                /* STK Push Parameters Form */
                <form onSubmit={handleTriggerStkPush} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Payment Amount (KES)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                        KES
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="100"
                        required
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="w-full pl-13 pr-4 py-2.5 text-base font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex gap-2 mt-1.5">
                      {[5000, 10000, 15000, Number(selectedStudentForPay.balance)].map((quickVal) => (
                        <button
                          key={quickVal}
                          type="button"
                          onClick={() => setPayAmount(String(quickVal))}
                          className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded"
                        >
                          KES {quickVal.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      M-Pesa Mobile Number
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="254708374149"
                        value={inputPhone}
                        onChange={(e) => setInputPhone(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Format: 2547XXXXXXXX (Kenyan Safaricom registered line)
                    </p>
                  </div>

                  {stkFeedback && !stkFeedback.success && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{stkFeedback.message}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingStk}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingStk ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Communicating with Daraja Gateway...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Dispatch M-Pesa STK Push (KES {Number(payAmount).toLocaleString()})</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Interactive Daraja Live Phone USSD Screen Simulator */
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold">STK Push Successfully Dispatched</div>
                      <div>CheckoutRequestID: <span className="font-mono">{activeCheckoutId}</span></div>
                    </div>
                  </div>

                  {/* Simulated Mobile Handset Frame */}
                  <div className="max-w-xs mx-auto bg-slate-900 rounded-3xl p-4 shadow-2xl border-4 border-slate-700 text-white space-y-3">
                    <div className="w-16 h-1 bg-slate-700 rounded-full mx-auto mb-2"></div>
                    <div className="text-center text-[10px] text-slate-400 tracking-wider font-semibold">
                      SAFARICOM M-PESA SIMULATOR
                    </div>

                    {/* USSD Prompt Box */}
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-center space-y-2">
                      <div className="text-xs font-semibold text-emerald-400">LipanaM-PesaOnline</div>
                      <div className="text-xs text-slate-200 font-medium">
                        Do you want to pay <span className="font-bold text-white">KES {Number(payAmount).toLocaleString()}</span> to <span className="font-bold text-emerald-300">Greenfield Academy</span>?
                      </div>
                      <div className="text-[11px] text-slate-400">Account: {selectedStudentForPay.account_number}</div>

                      <div className="pt-2">
                        <div className="text-[10px] text-slate-400 mb-1">Enter 4-Digit M-Pesa PIN:</div>
                        <input
                          type="password"
                          maxLength={4}
                          value={simulatedPin}
                          onChange={(e) => setSimulatedPin(e.target.value)}
                          className="w-24 text-center tracking-widest text-lg font-bold bg-slate-900 border border-slate-600 rounded py-1 text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* USSD Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleSimulatePinAction('cancel')}
                        disabled={isSimulatingCallback}
                        className="py-2 px-3 text-xs font-semibold bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded-lg border border-rose-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSimulatePinAction('approve')}
                        disabled={isSimulatingCallback}
                        className="py-2 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1"
                      >
                        {isSimulatingCallback ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm PIN</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-center text-xs text-slate-500">
                    Click <strong>"Confirm PIN"</strong> to execute the atomic callback transaction on Safaricom's webhook.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>256-Bit SSL Encrypted & HMAC Password Digest</span>
              </div>
              <button
                onClick={() => {
                  setSelectedStudentForPay(null);
                  setActiveCheckoutId(null);
                }}
                className="font-medium text-slate-700 hover:text-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RECEIPT SLIP MODAL */}
      {/* ========================================================================= */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-base">Official M-Pesa Payment Receipt</h4>
                <p className="text-xs text-slate-500">Greenfield Academy Bursar Department</p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 text-center space-y-1">
              <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                M-Pesa Receipt Code
              </div>
              <div className="text-2xl font-mono font-black text-emerald-700 tracking-wider">
                {selectedReceipt.mpesa_receipt_number || 'PENDING'}
              </div>
              <div className="text-xs text-emerald-600">
                Verified via Safaricom Daraja Webhook
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Beneficiary Student:</span>
                <span className="font-semibold text-slate-900">
                  {selectedReceipt.first_name ? `${selectedReceipt.first_name} ${selectedReceipt.last_name}` : selectedReceipt.student_id}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Amount Paid:</span>
                <span className="font-bold text-slate-900">
                  KES {Number(selectedReceipt.amount).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Payer Mobile:</span>
                <span className="font-mono text-slate-800">{selectedReceipt.parent_phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Transaction Date:</span>
                <span className="text-slate-800">
                  {new Date(selectedReceipt.created_at).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Checkout Request ID:</span>
                <span className="font-mono text-[11px] text-slate-600">{selectedReceipt.checkout_request_id}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedReceipt(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
