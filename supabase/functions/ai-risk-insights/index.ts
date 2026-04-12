import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inputs, riskScore } = await req.json();

    if (!inputs || !riskScore) {
      return new Response(JSON.stringify({ error: "Missing inputs or riskScore" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const runway = inputs.monthlyBurnRate > 0
      ? (inputs.cashOnHand / inputs.monthlyBurnRate).toFixed(1)
      : "N/A";

    const systemPrompt = `You are a senior startup financial analyst at a top-tier VC firm. Provide a concise, actionable risk commentary for a startup based on their financial metrics and risk scores.

Structure your response as:
1. **Executive Summary** (2-3 sentences about overall risk posture)
2. **Key Concerns** (top 2-3 specific risks with data-backed reasoning)
3. **Strengths** (1-2 positive aspects if any)
4. **Actionable Next Steps** (3 specific, prioritized recommendations)

Be direct, use numbers from the data, and compare to industry benchmarks where relevant. Keep it under 300 words. Use INR (₹) for currency.`;

    const userPrompt = `Analyze this startup:

Company: ${inputs.companyName} (${inputs.industry})

Financial Metrics:
- Monthly Revenue: ₹${Number(inputs.monthlyRevenue).toLocaleString('en-IN')}
- Monthly Burn Rate: ₹${Number(inputs.monthlyBurnRate).toLocaleString('en-IN')}
- Cash on Hand: ₹${Number(inputs.cashOnHand).toLocaleString('en-IN')}
- Cash Runway: ${runway} months
- Total Funding: ₹${Number(inputs.totalFunding).toLocaleString('en-IN')}
- Revenue Growth Rate: ${inputs.revenueGrowthRate}% monthly
- Operating Margin: ${inputs.operatingMargin}%
- Churn Rate: ${inputs.churnRate}%
- Headcount: ${inputs.headcount}
- Customers: ${inputs.customerCount}
- Debt-to-Equity: ${inputs.debtToEquityRatio}

Risk Scores (0-100, higher = more risk):
- Overall: ${riskScore.overall}/100 (${riskScore.label})
- Financial: ${riskScore.financial}/100
- Operational: ${riskScore.operational}/100
- Market: ${riskScore.market}/100
- Growth: ${riskScore.growth}/100`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI insights error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
