import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sale_id, buyer_token } = await req.json();
    if (!sale_id || typeof buyer_token !== "string" || buyer_token.length < 32) {
      return new Response(JSON.stringify({ error: "sale_id em falta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: sale } = await supabase
      .from("sales")
      .select("id, status, product_id, bumps, access_token")
      .eq("id", sale_id)
      .maybeSingle();

    if (!sale || !sale.access_token || sale.access_token !== buyer_token || sale.status !== "approved") {
      return new Response(JSON.stringify({ error: "Pagamento ainda não confirmado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productIds = [sale.product_id];
    if (Array.isArray(sale.bumps)) {
      for (const b of sale.bumps) if (b?.id) productIds.push(b.id);
    }

    const { data: products } = await supabase
      .from("products")
      .select("id, nome, delivery_type, external_url, file_url")
      .in("id", productIds);

    const items = (products || []).map((p) => ({
      id: p.id,
      nome: p.nome,
      delivery_type: p.delivery_type || "link",
      url: p.delivery_type === "file" ? p.file_url : p.external_url,
    }));

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
