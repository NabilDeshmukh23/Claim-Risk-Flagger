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
  Search
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

const BACKEND_URL = 'http://localhost:3001';

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
      const merged: Claim[] = claimsData.map((c) => {
        const match = assessmentsData?.find((a) => a.claim_id === c.id);
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
        // Retain row in current view so it doesn't vanish
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
      alert('Could not reach backend on port 3001');
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-600/20">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Claims Fraud Risk Flagger</h1>
           
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex flex-wrap gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              <button 
                onClick={() => handleTabSwitch('pending')}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  filter === 'pending' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pending Review ({claims.filter(c => c.status === 'pending').length})
              </button>

              <button 
                onClick={() => handleTabSwitch('high')}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  filter === 'high' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                High Risk ({claims.filter(c => c.assessment?.risk_level === 'High').length})
              </button>

              <button 
                onClick={() => handleTabSwitch('medium')}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  filter === 'medium' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Medium Risk ({claims.filter(c => c.assessment?.risk_level === 'Medium').length})
              </button>

              <button 
                onClick={() => handleTabSwitch('low')}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  filter === 'low' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Low Risk ({claims.filter(c => c.assessment?.risk_level === 'Low').length})
              </button>

              <button 
                onClick={() => handleTabSwitch('all')}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  filter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Full Ledger ({claims.length})
              </button>
            </div>

            <button
              onClick={loadClaims}
              className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg transition"
              title="Refresh Records"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Ledger Table */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Loading ledger records from Supabase...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Claimant & Vehicle</th>
                    <th className="py-3.5 px-4">Type & Incident</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Timeline</th>
                    <th className="py-3.5 px-4">Risk Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {visibleClaims.map((claim) => {
                    const isAnalyzing = analyzingId === claim.id;
                    const isExpanded = expandedClaimId === claim.id;
                    const assessment = claim.assessment;
                    const wasJustAnalyzed = sessionAnalyzedIds.includes(claim.id);

                    return (
                      <React.Fragment key={claim.id}>
                        <tr 
                          className={`transition ${
                            wasJustAnalyzed 
                              ? 'bg-slate-800/40 border-l-2 border-indigo-500' 
                              : isExpanded 
                              ? 'bg-slate-800/20' 
                              : 'hover:bg-slate-800/30'
                          }`}
                        >
                          <td className="py-4 px-4">
                            <div className="font-semibold text-slate-100 flex items-center space-x-2">
                              <span>{claim.customer_name}</span>
                              {wasJustAnalyzed && (
                                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                  Just Evaluated
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                              <Car className="h-3 w-3 text-slate-500" />
                              <span>{claim.vehicle_info}</span>
                            </div>
                          </td>

                          <td className="py-4 px-4 max-w-xs">
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 uppercase tracking-wide">
                              {claim.incident_type}
                            </span>
                            <p className="text-[11px] text-slate-400 truncate mt-1">
                              {claim.description}
                            </p>
                          </td>

                          <td className="py-4 px-4">
                            <span className="font-bold text-slate-100 text-sm">
                              {Number(claim.claimed_amount).toLocaleString()} AED
                            </span>
                          </td>

                          <td className="py-4 px-4 text-slate-400 space-y-0.5 text-[11px]">
                            <div>Incident: <span className="text-slate-300">{claim.incident_date}</span></div>
                            <div>Policy: <span className="text-slate-500">{claim.policy_start_date}</span></div>
                          </td>

                          <td className="py-4 px-4">
                            {assessment ? (
                              <span
                                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                                  assessment.risk_level === 'High'
                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                    : assessment.risk_level === 'Medium'
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                }`}
                              >
                                {assessment.risk_level === 'High' && <AlertTriangle className="h-3 w-3" />}
                                {assessment.risk_level === 'Medium' && <AlertTriangle className="h-3 w-3" />}
                                {assessment.risk_level === 'Low' && <CheckCircle2 className="h-3 w-3" />}
                                <span>{assessment.risk_level} Risk</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                <Clock className="h-3 w-3" />
                                <span>Pending Evaluation</span>
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-right">
                            {assessment ? (
                              <button
                                onClick={() => setExpandedClaimId(isExpanded ? null : claim.id)}
                                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-3 py-1.5 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/10 transition"
                              >
                                {isExpanded ? 'Hide Details' : 'View Signals'}
                              </button>
                            ) : claim.status === 'analyzed' ? (
                              <span className="text-[11px] text-slate-500 italic pr-2">Historical Record</span>
                            ) : (
                              <button
                                onClick={() => handleAnalyze(claim.id)}
                                disabled={isAnalyzing}
                                className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-md shadow-rose-600/20 transition inline-flex items-center space-x-1.5"
                              >
                                {isAnalyzing ? (
                                  <>
                                    <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Screening...</span>
                                  </>
                                ) : (
                                  <>
                                    <Search className="h-3 w-3" />
                                    <span>Analyze</span>
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>

                        {isExpanded && assessment && (
                          <tr className="bg-slate-950/80 border-b border-slate-800">
                            <td colSpan={6} className="p-5">
                              <div className="space-y-4 max-w-4xl mx-auto">
                                
                                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Gemini Assessment Rationale
                                  </div>
                                  <p className="text-xs text-slate-200 leading-relaxed">
                                    {assessment.reasoning}
                                  </p>
                                </div>

                                <div className="grid grid-cols-4 gap-3">
                                  <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                                    <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-bold">
                                      <History className="h-3 w-3 text-indigo-400" />
                                      <span>Frequency (6 Mos)</span>
                                    </div>
                                    <div className="text-base font-extrabold text-white mt-1">
                                      {assessment.recent_claim_count} {assessment.recent_claim_count === 1 ? 'claim' : 'claims'}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">By {claim.customer_name}</p>
                                  </div>

                                  <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                                    <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-bold">
                                      <TrendingUp className="h-3 w-3 text-amber-400" />
                                      <span>Peer Baseline Avg</span>
                                    </div>
                                    <div className="text-base font-extrabold text-white mt-1">
                                      {assessment.avg_amount_similar_type.toLocaleString()} AED
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">For {claim.incident_type}</p>
                                  </div>

                                  <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                                    <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-bold">
                                      <TrendingUp className="h-3 w-3 text-rose-400" />
                                      <span>Amount vs Avg Ratio</span>
                                    </div>
                                    <div className="text-base font-extrabold text-white mt-1">
                                      {assessment.amount_vs_avg_ratio}x
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Statistical deviation</p>
                                  </div>

                                  <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                                    <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-bold">
                                      <CalendarClock className="h-3 w-3 text-emerald-400" />
                                      <span>Inception Gap</span>
                                    </div>
                                    <div className="text-base font-extrabold text-white mt-1">
                                      {assessment.days_since_policy_start} days
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Start to incident date</p>
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