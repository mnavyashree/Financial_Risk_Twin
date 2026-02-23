import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Thresholds {
  runway_months_max?: number;
  runway_months_min?: number;
  burn_multiple_min?: number;
  churn_rate_min?: number;
  churn_rate_max?: number;
  customer_count_max?: number;
  debt_to_equity_min?: number;
  operating_margin_max?: number;
  operating_margin_min?: number;
  revenue_growth_max?: number;
  revenue_growth_min?: number;
  monthly_revenue_max?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { inputs } = await req.json();
    if (!inputs) {
      return new Response(JSON.stringify({ error: "Missing inputs" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: scenarios, error } = await supabaseAdmin
      .from("risk_scenarios")
      .select("*");

    if (error || !scenarios) {
      return new Response(JSON.stringify({ error: "Failed to fetch scenarios" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const runway = inputs.monthlyBurnRate > 0 ? inputs.cashOnHand / inputs.monthlyBurnRate : 24;
    const burnMultiple = inputs.monthlyRevenue > 0 ? inputs.monthlyBurnRate / inputs.monthlyRevenue : 5;

    // Score each scenario by how many thresholds match
    const scored = scenarios.map((scenario: { thresholds: Thresholds; [key: string]: unknown }) => {
      const t = scenario.thresholds;
      let matches = 0;
      let total = 0;

      if (t.runway_months_max !== undefined) { total++; if (runway <= t.runway_months_max) matches++; }
      if (t.runway_months_min !== undefined) { total++; if (runway >= t.runway_months_min) matches++; }
      if (t.burn_multiple_min !== undefined) { total++; if (burnMultiple >= t.burn_multiple_min) matches++; }
      if (t.churn_rate_min !== undefined) { total++; if (inputs.churnRate >= t.churn_rate_min) matches++; }
      if (t.churn_rate_max !== undefined) { total++; if (inputs.churnRate <= t.churn_rate_max) matches++; }
      if (t.customer_count_max !== undefined) { total++; if (inputs.customerCount <= t.customer_count_max) matches++; }
      if (t.debt_to_equity_min !== undefined) { total++; if (inputs.debtToEquityRatio >= t.debt_to_equity_min) matches++; }
      if (t.operating_margin_max !== undefined) { total++; if (inputs.operatingMargin <= t.operating_margin_max) matches++; }
      if (t.operating_margin_min !== undefined) { total++; if (inputs.operatingMargin >= t.operating_margin_min) matches++; }
      if (t.revenue_growth_max !== undefined) { total++; if (inputs.revenueGrowthRate <= t.revenue_growth_max) matches++; }
      if (t.revenue_growth_min !== undefined) { total++; if (inputs.revenueGrowthRate >= t.revenue_growth_min) matches++; }
      if (t.monthly_revenue_max !== undefined) { total++; if (inputs.monthlyRevenue <= t.monthly_revenue_max) matches++; }

      return { ...scenario, matchScore: total > 0 ? matches / total : 0 };
    });

    scored.sort((a: { matchScore: number }, b: { matchScore: number }) => b.matchScore - a.matchScore);

    const matched = scored.filter((s: { matchScore: number }) => s.matchScore > 0.5).slice(0, 3);

    return new Response(JSON.stringify({ matchedScenarios: matched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
