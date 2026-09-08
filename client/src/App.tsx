import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Car, 
  TrendingUp, 
  History, 
  CalendarClock, 
  RefreshCw,
  Search,
  Check,
  XCircle,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  DollarSign
} from 'lucide-react';
import { supabase } from './lib/supabase';

interface Claim {
  id: string;
  customer_name: string;
  vehicle_info: string;
  incident_date: string;
  policy_start_date: string;
  description: string;
  claimed_amount: number;
  incident_type: string;
  status: 'pending' | 'analyzed' | 'approved' | 'escalated' | 'rejected';
  assessment?: {
    risk_level: 'Low' | 'Medium' | 'High';
    reasoning: string;
    recent_claim_count: number;
    avg_amount_similar_type: number;
    amount_vs_avg_ratio: number;
    days_since_policy_start: number;
  };
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function App() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'analyzed' | 'approved' | 'escalated' | 'rejected' | 'all'>('pending');

  useEffect(() => {
    loadClaims();
  }, []);

  async function loadClaims() {
    setLoading(true);
    const { data: claimsData } = await supabase
      .from('claims')
      .select('*')
      .order('incident_date', { ascending: false });

    const { data: assessmentsData } = await supabase
      .from('fraud_assessments')
      .select('*');

    if (claimsData) {
      const merged: Claim[] = claimsData.map((c: any) => {
        const match = assessmentsData?.find((a: any) => a.claim_id === c.id);
        return {
          ...c,
          assessment: match || undefined,
        };
      });
      setClaims(merged);
    }
    setLoading(false);
  }

  async function handleAnalyze(claimId: string) {
    setAnalyzingId(claimId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/analyze-claim/${claimId}`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        setClaims((prev) =>
          prev.map((c) => {
            if (c.id === claimId) {
              return {
                ...c,
                status: 'analyzed',
                assessment: {
                  risk_level: data.riskLevel,
                  reasoning: data.reasoning,
                  recent_claim_count: data.signals.recentClaimCount,
                  avg_amount_similar_type: data.signals.avgAmountForSimilarType,
                  amount_vs_avg_ratio: data.signals.amountVsAvgRatio,
                  days_since_policy_start: data.signals.daysSincePolicyStart,
                },
              };
            }
            return c;
          })
        );
        setExpandedClaimId(claimId);
      }
    } catch (err) {
      console.error(err);
      alert('Could not reach backend service.');
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleDecision(claimId: string, decision: 'approved' | 'escalated' | 'rejected') {
    setActingId(claimId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/claim-decision/${claimId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();

      if (data.success) {
        setClaims((prev) =>
          prev.map((c) => (c.id === claimId ? { ...c, status: decision } : c))
        );
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update decision');
    } finally {
      setActingId(null);
    }
  }

  // Calculate Operational Metrics
  const totalApprovedAmount = claims
    .filter((c) => c.status === 'approved')
    .reduce((sum, c) => sum + Number(c.claimed_amount), 0);

  const totalPreventedAmount = claims
    .filter((c) => c.status === 'rejected' || c.status === 'escalated')
    .reduce((sum, c) => sum + Number(c.claimed_amount), 0);

  const visibleClaims = claims.filter((c) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 md:p-10 antialiased">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center space-x-3.5">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 flex items-center justify-center shadow-md shadow-rose-500/20 text-white">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Motor Claims Decision Portal
                </h1>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  SIU Live
                </span>
              </div>
            
            </div>
          </div>

          <button
            onClick={loadClaims}
            className="flex items-center space-x-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition w-fit"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync Claims</span>
          </button>
        </header>

        {/* Executive KPI Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
              <span>Pending Screening</span>
              <Clock className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">
              {claims.filter((c) => c.status === 'pending').length}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Unanalyzed submissions</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-amber-600 text-xs font-semibold uppercase">
              <span>Awaiting Decision</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">
              {claims.filter((c) => c.status === 'analyzed').length}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">AI evaluated, awaiting human sign-off</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-emerald-600 text-xs font-semibold uppercase">
              <span>Settled (Approved)</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-2">
              {totalApprovedAmount.toLocaleString()} <span className="text-sm font-bold text-emerald-600">AED</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{claims.filter((c) => c.status === 'approved').length} claims approved for payout</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-rose-600 text-xs font-semibold uppercase">
              <span>Fraud Intercepted</span>
              <ShieldAlert className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-extrabold text-rose-700 mt-2">
              {totalPreventedAmount.toLocaleString()} <span className="text-sm font-bold text-rose-600">AED</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Blocked via rejection or SIU referral</p>
          </div>
        </div>

        {/* Lifecycle Tabs */}
        <div className="flex items-center overflow-x-auto no-scrollbar bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs font-medium w-full">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition shrink-0 ${
              filter === 'pending' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Screening ({claims.filter((c) => c.status === 'pending').length})
          </button>

          <button
            onClick={() => setFilter('analyzed')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition shrink-0 ${
              filter === 'analyzed' ? 'bg-amber-100/70 text-amber-900 border border-amber-200 font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Needs Decision ({claims.filter((c) => c.status === 'analyzed').length})
          </button>

          <button
            onClick={() => setFilter('approved')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition shrink-0 ${
              filter === 'approved' ? 'bg-emerald-100/70 text-emerald-900 border border-emerald-200 font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approved ({claims.filter((c) => c.status === 'approved').length})
          </button>

          <button
            onClick={() => setFilter('escalated')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition shrink-0 ${
              filter === 'escalated' ? 'bg-indigo-100/70 text-indigo-900 border border-indigo-200 font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Escalated to SIU ({claims.filter((c) => c.status === 'escalated').length})
          </button>

          <button
            onClick={() => setFilter('rejected')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition shrink-0 ${
              filter === 'rejected' ? 'bg-rose-100/70 text-rose-900 border border-rose-200 font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rejected ({claims.filter((c) => c.status === 'rejected').length})
          </button>

          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition shrink-0 ${
              filter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Full Ledger ({claims.length})
          </button>
        </div>

        {/* Claims Table Container */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-16 text-center text-slate-500 text-sm flex flex-col items-center justify-center space-y-2">
              <span className="h-5 w-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
              <p>Loading claims data from Supabase...</p>
            </div>
          ) : visibleClaims.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No claims currently in this status queue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-5">Claimant & Vehicle</th>
                    <th className="py-3.5 px-5">Incident Narrative</th>
                    <th className="py-3.5 px-5">Amount</th>
                    <th className="py-3.5 px-5">Status & Risk</th>
                    <th className="py-3.5 px-5 text-right">Workflow Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleClaims.map((claim) => {
                    const isAnalyzing = analyzingId === claim.id;
                    const isActing = actingId === claim.id;
                    const isExpanded = expandedClaimId === claim.id;
                    const assessment = claim.assessment;

                    return (
                      <React.Fragment key={claim.id}>
                        <tr className={`transition-colors ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50/70'}`}>
                          
                          {/* Claimant */}
                          <td className="py-4 px-5 align-top">
                            <div className="font-semibold text-slate-900">{claim.customer_name}</div>
                            <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-0.5">
                              <Car className="h-3.5 w-3.5 text-slate-400" />
                              <span>{claim.vehicle_info}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                              Policy: {claim.policy_start_date}
                            </div>
                          </td>

                          {/* Narrative */}
                          <td className="py-4 px-5 min-w-[300px] max-w-md align-top">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
                              {claim.incident_type}
                            </span>
                            <p className="text-[11px] text-slate-700 leading-relaxed mt-1.5 whitespace-normal break-words">
                              {claim.description}
                            </p>
                            <div className="text-[10px] text-slate-400 mt-1">
                              Incident Date: <span className="font-medium text-slate-600">{claim.incident_date}</span>
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="py-4 px-5 align-top">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {Number(claim.claimed_amount).toLocaleString()} <span className="text-xs font-semibold text-slate-500">AED</span>
                            </span>
                          </td>

                          {/* Lifecycle Status & Risk Badge */}
                          <td className="py-4 px-5 align-top space-y-1.5">
                            <div>
                              {claim.status === 'pending' && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  <Clock className="h-3 w-3 text-slate-400" />
                                  <span>Pending Screening</span>
                                </span>
                              )}
                              {claim.status === 'analyzed' && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                                  <span>Needs Decision</span>
                                </span>
                              )}
                              {claim.status === 'approved' && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <Check className="h-3 w-3 text-emerald-600" />
                                  <span>Settlement Approved</span>
                                </span>
                              )}
                              {claim.status === 'escalated' && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                  <AlertOctagon className="h-3 w-3 text-indigo-600" />
                                  <span>Escalated to SIU</span>
                                </span>
                              )}
                              {claim.status === 'rejected' && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                                  <XCircle className="h-3 w-3 text-rose-600" />
                                  <span>Claim Rejected</span>
                                </span>
                              )}
                            </div>

                            {/* Risk Flag if Analyzed */}
                            {assessment && (
                              <div>
                                <span
                                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                    assessment.risk_level === 'High'
                                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                                      : assessment.risk_level === 'Medium'
                                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  }`}
                                >
                                  <span>{assessment.risk_level} Fraud Risk</span>
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Action Column */}
                          <td className="py-4 px-5 text-right align-top space-y-2">
                            {claim.status === 'pending' ? (
                              <button
                                onClick={() => handleAnalyze(claim.id)}
                                disabled={isAnalyzing}
                                className="bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition inline-flex items-center space-x-1.5"
                              >
                                {isAnalyzing ? (
                                  <>
                                    <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    <span>Screening...</span>
                                  </>
                                ) : (
                                  <>
                                    <Search className="h-3.5 w-3.5" />
                                    <span>Run AI Screen</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <div className="flex flex-col items-end space-y-1.5">
                                {/* Decision Buttons for Analyzed Claims */}
                                {claim.status === 'analyzed' && (
                                  <div className="flex items-center space-x-1.5">
                                    <button
                                      onClick={() => handleDecision(claim.id, 'approved')}
                                      disabled={isActing}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] rounded-md shadow-xs transition flex items-center space-x-1"
                                      title="Approve Settlement"
                                    >
                                      <Check className="h-3 w-3" />
                                      <span>Approve</span>
                                    </button>

                                    <button
                                      onClick={() => handleDecision(claim.id, 'escalated')}
                                      disabled={isActing}
                                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] rounded-md shadow-xs transition flex items-center space-x-1"
                                      title="Refer to Special Investigation Unit"
                                    >
                                      <AlertOctagon className="h-3 w-3" />
                                      <span>SIU</span>
                                    </button>

                                    <button
                                      onClick={() => handleDecision(claim.id, 'rejected')}
                                      disabled={isActing}
                                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] rounded-md shadow-xs transition flex items-center space-x-1"
                                      title="Reject Claim"
                                    >
                                      <XCircle className="h-3 w-3" />
                                      <span>Reject</span>
                                    </button>
                                  </div>
                                )}

                                {assessment && (
                                  <button
                                    onClick={() => setExpandedClaimId(isExpanded ? null : claim.id)}
                                    className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 transition flex items-center space-x-1"
                                  >
                                    <span>{isExpanded ? 'Hide Evidence' : 'View Evidence'}</span>
                                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                        </tr>

                        {/* Expandable Evidence Drawer */}
                        {isExpanded && assessment && (
                          <tr className="bg-slate-50/90 border-y border-slate-200">
                            <td colSpan={5} className="p-6">
                              <div className="space-y-4 max-w-5xl mx-auto">
                                
                                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                                    <span>Gemini Audit Synthesis</span>
                                  </div>
                                  <p className="text-xs text-slate-700 leading-relaxed font-normal">
                                    {assessment.reasoning}
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                                    <div className="flex items-center space-x-1.5 text-slate-500 text-[10px] uppercase font-bold">
                                      <History className="h-3.5 w-3.5 text-indigo-600" />
                                      <span>Recent Claims</span>
                                    </div>
                                    <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                                      {assessment.recent_claim_count} {assessment.recent_claim_count === 1 ? 'claim' : 'claims'}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">Filed in last 6 months</p>
                                  </div>

                                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                                    <div className="flex items-center space-x-1.5 text-slate-500 text-[10px] uppercase font-bold">
                                      <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                                      <span>Typical Cost</span>
                                    </div>
                                    <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                                      {assessment.avg_amount_similar_type.toLocaleString()} <span className="text-xs font-semibold text-slate-500">AED</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">Normal for {claim.incident_type}</p>
                                  </div>

                                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                                    <div className="flex items-center space-x-1.5 text-slate-500 text-[10px] uppercase font-bold">
                                      <TrendingUp className="h-3.5 w-3.5 text-rose-600" />
                                      <span>Price Difference</span>
                                    </div>
                                    <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                                      {assessment.amount_vs_avg_ratio}x higher
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Than average claim</p>
                                  </div>

                                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                                    <div className="flex items-center space-x-1.5 text-slate-500 text-[10px] uppercase font-bold">
                                      <CalendarClock className="h-3.5 w-3.5 text-emerald-600" />
                                      <span>Policy Age</span>
                                    </div>
                                    <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                                      {assessment.days_since_policy_start} days old
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Days before accident</p>
                                  </div>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}