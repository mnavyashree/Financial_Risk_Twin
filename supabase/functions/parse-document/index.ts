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
    const { textContent } = await req.json();

    if (!textContent || typeof textContent !== "string" || textContent.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or empty textContent" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Truncate very long documents to avoid token limits
    const truncated = textContent.slice(0, 15000);

    const systemPrompt = `You are a financial data extraction assistant. You extract structured financial metrics from unstructured document text.

Extract the following fields if present in the document. Only include fields you can confidently identify. Use numbers only (no currency symbols, no commas). For percentages, use the raw number (e.g., 15 not 15%).

Fields to extract:
- companyName: string
- industry: one of SaaS, Fintech, Healthcare, E-commerce, AI/ML, Edtech, Cleantech, Biotech, Logistics, Other
- monthlyRevenue: number (monthly, in INR)
- monthlyBurnRate: number (monthly, in INR)
- totalFunding: number (in INR)
- cashOnHand: number (in INR)
- headcount: number (team size / employees)
- customerCount: number
- churnRate: number (monthly churn percentage)
- revenueGrowthRate: number (monthly growth percentage)
- debtToEquityRatio: number
- operatingMargin: number (percentage, can be negative)

If a value is given in Lakhs, multiply by 100000. If in Crores, multiply by 10000000. If in thousands (K), multiply by 1000.
If annual figures are provided, divide by 12 to get monthly values where appropriate (revenue, burn rate).`;

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
          { role: "user", content: `Extract financial metrics from this document:\n\n${truncated}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_financial_data",
              description: "Extract structured financial metrics from document text",
              parameters: {
                type: "object",
                properties: {
                  companyName: { type: "string", description: "Company name" },
                  industry: {
                    type: "string",
                    enum: ["SaaS", "Fintech", "Healthcare", "E-commerce", "AI/ML", "Edtech", "Cleantech", "Biotech", "Logistics", "Other"],
                    description: "Industry sector",
                  },
                  monthlyRevenue: { type: "number", description: "Monthly revenue in INR" },
                  monthlyBurnRate: { type: "number", description: "Monthly burn rate in INR" },
                  totalFunding: { type: "number", description: "Total funding raised in INR" },
                  cashOnHand: { type: "number", description: "Cash on hand in INR" },
                  headcount: { type: "number", description: "Number of employees" },
                  customerCount: { type: "number", description: "Number of customers" },
                  churnRate: { type: "number", description: "Monthly churn rate percentage" },
                  revenueGrowthRate: { type: "number", description: "Monthly revenue growth percentage" },
                  debtToEquityRatio: { type: "number", description: "Debt to equity ratio" },
                  operatingMargin: { type: "number", description: "Operating margin percentage" },
                },
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_financial_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();

    // Extract tool call arguments
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "extract_financial_data") {
      return new Response(
        JSON.stringify({ error: "AI could not extract financial data from this document" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let extractedData: Record<string, unknown>;
    try {
      extractedData = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse AI extraction result" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out null/undefined values and validate numbers
    const cleanedData: Record<string, string | number> = {};
    const stringFields = ["companyName", "industry"];
    const numericFields = [
      "monthlyRevenue", "monthlyBurnRate", "totalFunding", "cashOnHand",
      "headcount", "customerCount", "churnRate", "revenueGrowthRate",
      "debtToEquityRatio", "operatingMargin",
    ];

    for (const field of stringFields) {
      if (extractedData[field] && typeof extractedData[field] === "string") {
        cleanedData[field] = extractedData[field] as string;
      }
    }

    for (const field of numericFields) {
      const val = extractedData[field];
      if (val !== null && val !== undefined) {
        const num = typeof val === "number" ? val : parseFloat(String(val));
        if (!isNaN(num)) {
          cleanedData[field] = num;
        }
      }
    }

    return new Response(
      JSON.stringify({ data: cleanedData, fieldsExtracted: Object.keys(cleanedData).length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("parse-document error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
