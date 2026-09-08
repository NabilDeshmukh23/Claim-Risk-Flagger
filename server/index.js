import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Insurance Fraud Flagger Engine' });
});

app.post('/api/analyze-claim/:claimId', async (req, res) => {
  const { claimId } = req.params;

  try {
    const { data: claim, error: claimErr } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single();

    if (claimErr || !claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { count: recentClaimCount } = await supabase
      .from('claims')
      .select('id', { count: 'exact', head: true })
      .eq('customer_name', claim.customer_name)
      .neq('id', claim.id)
      .gte('incident_date', sixMonthsAgo.toISOString().split('T')[0]);

    const { data: peerClaims } = await supabase
      .from('claims')
      .select('claimed_amount')
      .eq('incident_type', claim.incident_type)
      .neq('id', claim.id);

    let avgAmountForSimilarType = Number(claim.claimed_amount);
    if (peerClaims && peerClaims.length > 0) {
      const sum = peerClaims.reduce((acc, curr) => acc + Number(curr.claimed_amount), 0);
      avgAmountForSimilarType = Math.round(sum / peerClaims.length);
    }

    const amountVsAvgRatio = avgAmountForSimilarType > 0 
      ? Number((Number(claim.claimed_amount) / avgAmountForSimilarType).toFixed(2))
      : 1.0;

    const incidentTime = new Date(claim.incident_date).getTime();
    const policyStartTime = new Date(claim.policy_start_date).getTime();
    const daysSincePolicyStart = Math.max(0, Math.round((incidentTime - policyStartTime) / (1000 * 60 * 60 * 24)));

    const signals = {
     recentClaimCount: recentClaimCount ?? 0,
      avgAmountForSimilarType,
      thisAmount: Number(claim.claimed_amount),
      amountVsAvgRatio,
      daysSincePolicyStart,
    };

    const prompt = `
You are assisting an insurance claims reviewer by flagging claims that may warrant closer review. You do not make final decisions — only flag and explain.

Claim description (from customer): "${claim.description}"

Computed risk signals for this claim:
- Number of previous claims this customer has filed in the last 6 months: ${signals.recentClaimCount}
- Average claimed amount for similar incident type (${claim.incident_type}): ${signals.avgAmountForSimilarType} AED
- This claim's amount: ${signals.thisAmount} AED (ratio to average: ${signals.amountVsAvgRatio}x)
- Days between policy start date and incident date: ${signals.daysSincePolicyStart} days

Based on the above, provide:
1. A risk level: Low, Medium, or High
2. A short (2-3 sentence) plain-English explanation a human reviewer can quickly read, referencing the specific signals that influenced your assessment.

Respond in this exact JSON format:
{"riskLevel": "Low" | "Medium" | "High", "reasoning": "..."}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const cleanText = (response.text || '').replace(/```json|```/g, '').trim();
    const parsedAssessment = JSON.parse(cleanText);

    await supabase
      .from('fraud_assessments')
      .insert([
        {
          claim_id: claim.id,
          risk_level: parsedAssessment.riskLevel,
          reasoning: parsedAssessment.reasoning,
          recent_claim_count: signals.recentClaimCount,
          avg_amount_similar_type: signals.avgAmountForSimilarType,
          amount_vs_avg_ratio: signals.amountVsAvgRatio,
          days_since_policy_start: signals.daysSincePolicyStart,
        },
      ]);

    await supabase
      .from('claims')
      .update({ status: 'analyzed' })
      .eq('id', claim.id);

    return res.json({
      success: true,
      riskLevel: parsedAssessment.riskLevel,
      reasoning: parsedAssessment.reasoning,
      signals,
    });
  } catch (err) {
    console.error('Analysis error:', err);
    return res.status(500).json({ error: 'Failed to complete fraud risk assessment' });
  }
});

// Demo Reset Endpoint
app.post('/api/reset-demo', async (req, res) => {
  try {
    await supabase.from('fraud_assessments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('claims').update({ status: 'pending' }).neq('status', 'pending');
    return res.json({ success: true, message: 'All claims reset to pending review.' });
  } catch (err) {
    console.error('Reset error:', err);
    return res.status(500).json({ error: 'Failed to reset demo data' });
  }
});

app.post('/api/claim-decision/:claimId', async (req, res) => {
  const { claimId } = req.params;
  const { decision } = req.body; 

  if (!['approved', 'escalated', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'Invalid decision type' });
  }

  try {
    const { error } = await supabase
      .from('claims')
      .update({ status: decision })
      .eq('id', claimId);

    if (error) throw error;
    return res.json({ success: true, status: decision });
  } catch (err) {
    console.error('Decision update error:', err);
    return res.status(500).json({ error: 'Failed to record decision' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});