import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }
  return rows;
}

const fieldMapping: Record<string, string> = {
  company_name: "companyName",
  companyname: "companyName",
  company: "companyName",
  industry: "industry",
  monthly_revenue: "monthlyRevenue",
  monthlyrevenue: "monthlyRevenue",
  revenue: "monthlyRevenue",
  monthly_burn_rate: "monthlyBurnRate",
  monthlyburnrate: "monthlyBurnRate",
  burn_rate: "monthlyBurnRate",
  burnrate: "monthlyBurnRate",
  total_funding: "totalFunding",
  totalfunding: "totalFunding",
  funding: "totalFunding",
  cash_on_hand: "cashOnHand",
  cashonhand: "cashOnHand",
  cash: "cashOnHand",
  headcount: "headcount",
  team_size: "headcount",
  teamsize: "headcount",
  employees: "headcount",
  customer_count: "customerCount",
  customercount: "customerCount",
  customers: "customerCount",
  churn_rate: "churnRate",
  churnrate: "churnRate",
  churn: "churnRate",
  revenue_growth_rate: "revenueGrowthRate",
  revenuegrowthrate: "revenueGrowthRate",
  growth_rate: "revenueGrowthRate",
  growthrate: "revenueGrowthRate",
  growth: "revenueGrowthRate",
  debt_to_equity_ratio: "debtToEquityRatio",
  debttoequityratio: "debtToEquityRatio",
  debt_equity: "debtToEquityRatio",
  debtequity: "debtToEquityRatio",
  operating_margin: "operatingMargin",
  operatingmargin: "operatingMargin",
  margin: "operatingMargin",
};

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { csvContent } = await req.json();
    if (!csvContent) {
      return new Response(JSON.stringify({ error: "Missing csvContent" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = parseCSV(csvContent);
    if (parsed.length === 0) {
      return new Response(JSON.stringify({ error: "No data rows found in CSV" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map CSV columns to our field names
    const row = parsed[0]; // Use first row
    const mappedData: Record<string, string | number> = {};

    for (const [csvCol, value] of Object.entries(row)) {
      const mappedField = fieldMapping[csvCol];
      if (mappedField) {
        if (mappedField === "companyName" || mappedField === "industry") {
          mappedData[mappedField] = value;
        } else {
          const num = parseFloat(value);
          if (!isNaN(num)) {
            mappedData[mappedField] = num;
          }
        }
      }
    }

    return new Response(JSON.stringify({ data: mappedData, totalRows: parsed.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
