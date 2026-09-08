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
  ChevronDown,
  ChevronUp
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
  status: 'pending' | 'analyzed';
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
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'high' | 'medium' | 'low' | 'all'>('pending');
  const [sessionAnalyzedIds, setSessionAnalyzedIds] = useState<string[]>([]);

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

  function handleTabSwitch(nextTab: typeof filter) {
    setFilter(nextTab);
    setSessionAnalyzedIds([]);
  }

  async function handleAnalyze(claimId: string) {
    setAnalyzingId(claimId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/analyze-claim/${claimId}`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        setSessionAnalyzedIds((prev) => [...prev, claimId]);

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

  const visibleClaims = claims.filter((c) => {
    if (filter === 'pending') {
      return c.status === 'pending' || sessionAnalyzedIds.includes(c.id);
    }
    if (filter === 'high') return c.assessment?.risk_level === 'High';
    if (filter === 'medium') return c.assessment?.risk_level === 'Medium';
    if (filter === 'low') return c.assessment?.risk_level === 'Low';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 md:p-10 antialiased">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* Header Section */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center space-x-3.5">
            <div className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 flex items-center justify-center shadow-md shadow-rose-500/20 text-white">
              <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  Claims Fraud Risk Flagger
                </h1>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                  Live Engine
                </span>
              </div>
              
            </div>
          </div>

          {/* Filter Bar & Controls */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center overflow-x-auto no-scrollbar bg-slate-100/80 border border-slate-200 rounded-xl p-1 text-xs font-medium w-full lg:w-auto">
              <button
                onClick={() => handleTabSwitch('pending')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg whitespace-nowrap transition shrink-0 ${
                  filter === 'pending'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending ({claims.filter((c) => c.status === 'pending').length})
              </button>

              <button
                onClick={() => handleTabSwitch('high')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg whitespace-nowrap transition shrink-0 ${
                  filter === 'high'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                High ({claims.filter((c) => c.assessment?.risk_level === 'High').length})
              </button>

              <button
                onClick={() => handleTabSwitch('medium')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg whitespace-nowrap transition shrink-0 ${
                  filter === 'medium'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Med ({claims.filter((c) => c.assessment?.risk_level === 'Medium').length})
              </button>

              <button
                onClick={() => handleTabSwitch('low')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg whitespace-nowrap transition shrink-0 ${
                  filter === 'low'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Low ({claims.filter((c) => c.assessment?.risk_level === 'Low').length})
              </button>

              <button
                onClick={() => handleTabSwitch('all')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg whitespace-nowrap transition shrink-0 ${
                  filter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({claims.length})
              </button>
            </div>

            <button
              onClick={loadClaims}
              className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-xl shadow-xs transition shrink-0"
              title="Refresh Records"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500 text-sm flex flex-col items-center justify-center space-y-2">
            <span className="h-5 w-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
            <p>Loading claims data from Supabase...</p>
          </div>
        ) : visibleClaims.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 text-sm">
            No claims found under this filter.
          </div>
        ) : (
          <>
            {/* Desktop / Tablet View (Table Layout) */}
            <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-5">Claimant & Vehicle</th>
                      <th className="py-3.5 px-5">Type & Incident</th>
                      <th className="py-3.5 px-5">Claimed Amount</th>
                      <th className="py-3.5 px-5">Timeline</th>
                      <th className="py-3.5 px-5">Risk Status</th>
                      <th className="py-3.5 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleClaims.map((claim) => {
                      const isAnalyzing = analyzingId === claim.id;
                      const isExpanded = expandedClaimId === claim.id;
                      const assessment = claim.assessment;
                      const wasJustAnalyzed = sessionAnalyzedIds.includes(claim.id);

                      return (
                        <React.Fragment key={claim.id}>
                          <tr
                            className={`transition-colors ${
                              wasJustAnalyzed
                                ? 'bg-indigo-50/60 border-l-4 border-indigo-600'
                                : isExpanded
                                ? 'bg-slate-50'
                                : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <td className="py-4 px-5">
                              <div className="font-semibold text-slate-900 flex items-center space-x-2">
                                <span>{claim.customer_name}</span>
                                {wasJustAnalyzed && (
                                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200">
                                    Just Evaluated
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-0.5">
                                <Car className="h-3.5 w-3.5 text-slate-400" />
                                <span>{claim.vehicle_info}</span>
                              </div>
                            </td>

                            <td className="py-4 px-5 min-w-[320px] max-w-md">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                                {claim.incident_type}
                              </span>
                              <p className="text-[11px] text-slate-700 leading-relaxed mt-1.5 whitespace-normal break-words">
                                {claim.description}
                              </p>
                            </td>

                            <td className="py-4 px-5">
                              <span className="font-bold text-slate-900 text-sm">
                                {Number(claim.claimed_amount).toLocaleString()}{' '}
                                <span className="text-xs font-semibold text-slate-500">AED</span>
                              </span>
                            </td>

                            <td className="py-4 px-5 text-slate-600 space-y-0.5 text-[11px]">
                              <div>Incident: <span className="text-slate-900 font-medium">{claim.incident_date}</span></div>
                              <div className="text-slate-400">Policy: {claim.policy_start_date}</div>
                            </td>

                            <td className="py-4 px-5">
                              {assessment ? (
                                <span
                                  className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                    assessment.risk_level === 'High'
                                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                                      : assessment.risk_level === 'Medium'
                                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  }`}
                                >
                                  {assessment.risk_level === 'High' && <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />}
                                  {assessment.risk_level === 'Medium' && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                                  {assessment.risk_level === 'Low' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                                  <span>{assessment.risk_level} Risk</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                  <Clock className="h-3 w-3 text-slate-400" />
                                  <span>Pending</span>
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-5 text-right">
                              {assessment ? (
                                <button
                                  onClick={() => setExpandedClaimId(isExpanded ? null : claim.id)}
                                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50/80 transition"
                                >
                                  {isExpanded ? 'Hide Breakdown' : 'View Signals'}
                                </button>
                              ) : claim.status === 'analyzed' ? (
                                <span className="text-[11px] text-slate-400 italic pr-2">Historical</span>
                              ) : (
                                <button
                                  onClick={() => handleAnalyze(claim.id)}
                                  disabled={isAnalyzing}
                                  className="bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-xs shadow-rose-600/10 transition inline-flex items-center space-x-1.5"
                                >
                                  {isAnalyzing ? (
                                    <>
                                      <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                      <span>Screening...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Search className="h-3.5 w-3.5" />
                                      <span>Analyze</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Telemetry Drawer */}
                          {isExpanded && assessment && (
                            <tr className="bg-slate-50/90 border-y border-slate-200">
                              <td colSpan={6} className="p-6">
                                <div className="space-y-4 max-w-5xl mx-auto">
                                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                                      <span>Gemini Audit Synthesis</span>
                                    </div>
                                    <p className="text-xs text-slate-700 leading-relaxed">
                                      {assessment.reasoning}
                                    </p>
                                  </div>

                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                                      <div className="flex items-center space-x-1.5 text-slate-500 text-[10px] uppercase font-bold">
                                        <History className="h-3.5 w-3.5 text-indigo-600" />
                                        <span>Velocity (6 Mos)</span>
                                      </div>
                                      <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                                        {assessment.recent_claim_count} {assessment.recent_claim_count === 1 ? 'claim' : 'claims'}
                                      </div>
                                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{claim.customer_name}</p>
                                    </div>

                                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                                      <div className="flex items-center space-x-1.5 text-slate-500 text-[10px] uppercase font-bold">
                                        <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                                        <span>Peer Baseline</span>
                                      </div>
                                      <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                                        {assessment.avg_amount_similar_type.toLocaleString()} <span className="text-xs font-semibold text-slate-500">AED</span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{claim.incident_type}</p>
                                    </div>

                                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                                      <div className="flex items-center space-x-1.5 text-slate-500 text-[10px] uppercase font-bold">
                                        <TrendingUp className="h-3.5 w-3.5 text-rose-600" />
                                        <span>Deviation Ratio</span>
                                      </div>
                                      <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                                        {assessment.amount_vs_avg_ratio}x
                                      </div>
                                      <p className="text-[11px] text-slate-500 mt-0.5">Historical multiple</p>
                                    </div>

                                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                                      <div className="flex items-center space-x-1.5 text-slate-500 text-[10px] uppercase font-bold">
                                        <CalendarClock className="h-3.5 w-3.5 text-emerald-600" />
                                        <span>Inception Gap</span>
                                      </div>
                                      <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                                        {assessment.days_since_policy_start} days
                                      </div>
                                      <p className="text-[11px] text-slate-500 mt-0.5">Policy to incident</p>
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
            </div>

            {/* Mobile View (Card List Layout) */}
            <div className="block md:hidden space-y-4">
              {visibleClaims.map((claim) => {
                const isAnalyzing = analyzingId === claim.id;
                const isExpanded = expandedClaimId === claim.id;
                const assessment = claim.assessment;
                const wasJustAnalyzed = sessionAnalyzedIds.includes(claim.id);

                return (
                  <div
                    key={claim.id}
                    className={`bg-white rounded-2xl border transition shadow-xs overflow-hidden ${
                      wasJustAnalyzed
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="p-4 pb-3 border-b border-slate-100 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-sm">{claim.customer_name}</span>
                          {wasJustAnalyzed && (
                            <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200">
                              Evaluated
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                          <Car className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{claim.vehicle_info}</span>
                        </div>
                      </div>

                      {/* Risk Badge */}
                      <div className="shrink-0">
                        {assessment ? (
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              assessment.risk_level === 'High'
                                ? 'bg-rose-50 border-rose-200 text-rose-700'
                                : assessment.risk_level === 'Medium'
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            }`}
                          >
                            {assessment.risk_level === 'High' && <AlertTriangle className="h-3 w-3 text-rose-600" />}
                            {assessment.risk_level === 'Medium' && <AlertTriangle className="h-3 w-3 text-amber-600" />}
                            {assessment.risk_level === 'Low' && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                            <span>{assessment.risk_level}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>Pending</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
                          {claim.incident_type}
                        </span>
                        <span className="font-extrabold text-slate-900 text-base">
                          {Number(claim.claimed_amount).toLocaleString()} <span className="text-xs font-semibold text-slate-500">AED</span>
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">
                        {claim.description}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>Incident: <span className="font-semibold text-slate-800">{claim.incident_date}</span></div>
                        <div>Policy: <span className="text-slate-600">{claim.policy_start_date}</span></div>
                      </div>

                      {/* Card Action */}
                      <div className="pt-1">
                        {assessment ? (
                          <button
                            onClick={() => setExpandedClaimId(isExpanded ? null : claim.id)}
                            className="w-full flex items-center justify-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold py-2 rounded-xl border border-indigo-200 bg-indigo-50/40 active:bg-indigo-50 transition"
                          >
                            <span>{isExpanded ? 'Hide Assessment Breakdown' : 'View Anomaly Signals'}</span>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        ) : claim.status === 'analyzed' ? (
                          <span className="block text-center text-xs text-slate-400 italic py-1">Historical Record</span>
                        ) : (
                          <button
                            onClick={() => handleAnalyze(claim.id)}
                            disabled={isAnalyzing}
                            className="w-full flex items-center justify-center space-x-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs py-2.5 rounded-xl shadow-xs transition"
                          >
                            {isAnalyzing ? (
                              <>
                                <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                <span>Running AI Screening...</span>
                              </>
                            ) : (
                              <>
                                <Search className="h-3.5 w-3.5" />
                                <span>Run AI Risk Analysis</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mobile Expanded Signals Drawer */}
                    {isExpanded && assessment && (
                      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                          <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                            <span>Gemini Audit Synthesis</span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed font-normal">
                            {assessment.reasoning}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                            <div className="flex items-center space-x-1 text-slate-500 text-[10px] uppercase font-bold">
                              <History className="h-3 w-3 text-indigo-600" />
                              <span>Velocity (6M)</span>
                            </div>
                            <div className="text-base font-extrabold text-slate-900 mt-1">
                              {assessment.recent_claim_count} {assessment.recent_claim_count === 1 ? 'claim' : 'claims'}
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                            <div className="flex items-center space-x-1 text-slate-500 text-[10px] uppercase font-bold">
                              <TrendingUp className="h-3 w-3 text-amber-600" />
                              <span>Peer Average</span>
                            </div>
                            <div className="text-base font-extrabold text-slate-900 mt-1">
                              {assessment.avg_amount_similar_type.toLocaleString()} <span className="text-[10px] font-semibold text-slate-500">AED</span>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                            <div className="flex items-center space-x-1 text-slate-500 text-[10px] uppercase font-bold">
                              <TrendingUp className="h-3 w-3 text-rose-600" />
                              <span>Deviation</span>
                            </div>
                            <div className="text-base font-extrabold text-slate-900 mt-1">
                              {assessment.amount_vs_avg_ratio}x
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                            <div className="flex items-center space-x-1 text-slate-500 text-[10px] uppercase font-bold">
                              <CalendarClock className="h-3 w-3 text-emerald-600" />
                              <span>Inception Gap</span>
                            </div>
                            <div className="text-base font-extrabold text-slate-900 mt-1">
                              {assessment.days_since_policy_start} days
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>
    </div>
  );
}