import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, session_token, ...body } = await req.json();
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // LOGIN
    if (action === "login") {
      const adminKey = Deno.env.get("ADMIN_ACCESS_KEY");
      if (!adminKey || body.access_key !== adminKey) {
        return new Response(JSON.stringify({ error: "Chave de acesso inválida" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = crypto.randomUUID();
      const { error } = await supabaseAdmin.from("admin_sessions").insert({
        session_token: token,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
      return new Response(JSON.stringify({ session_token: token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // VALIDATE SESSION
    const { data: session } = await supabaseAdmin
      .from("admin_sessions")
      .select("*")
      .eq("session_token", session_token)
      .gte("expires_at", new Date().toISOString())
      .single();

    if (!session) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DASHBOARD STATS
    if (action === "stats") {
      let salesQuery = supabaseAdmin.from("sales").select("valor, status, user_id, created_at");
      if (body.date_from) salesQuery = salesQuery.gte("created_at", body.date_from);
      if (body.date_to) salesQuery = salesQuery.lte("created_at", body.date_to);

      const [{ count: userCount }, { data: sales }, { data: pendingWithdrawals }] = await Promise.all([
        supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
        salesQuery,
        supabaseAdmin.from("withdrawals").select("*").eq("status", "pendente"),
      ]);
      const approvedSales = (sales || []).filter(s => s.status === "approved");

      // Top sellers
      const sellerMap: Record<string, number> = {};
      for (const s of approvedSales) {
        sellerMap[s.user_id] = (sellerMap[s.user_id] || 0) + Number(s.valor);
      }
      const topSellerIds = Object.entries(sellerMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
      let topSellers: any[] = [];
      if (topSellerIds.length > 0) {
        const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id, nome, email, avatar_url").in("user_id", topSellerIds.map(t => t[0]));
        const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
        topSellers = topSellerIds.map(([uid, total]) => ({
          user_id: uid,
          nome: profileMap[uid]?.nome || "—",
          email: profileMap[uid]?.email || "—",
          avatar_url: profileMap[uid]?.avatar_url || null,
          total_revenue: total,
          total_sales: approvedSales.filter(s => s.user_id === uid).length,
        }));
      }

      return new Response(JSON.stringify({
        total_users: userCount || 0,
        total_sales: (sales || []).length,
        total_revenue: approvedSales.reduce((a, s) => a + Number(s.valor), 0),
        pending_withdrawals: (pendingWithdrawals || []).length,
        top_sellers: topSellers,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // LIST USERS
    if (action === "list_users") {
      const { data } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false });
      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // USER DETAILS (sales stats)
    if (action === "user_details") {
      const uid = body.user_id;
      const { data: sales } = await supabaseAdmin.from("sales").select("valor, status, product_id").eq("user_id", uid);
      const approved = (sales || []).filter(s => s.status === "approved");
      const totalRevenue = approved.reduce((a, s) => a + Number(s.valor), 0);
      const totalSales = approved.length;

      // Top product
      const productCount: Record<string, number> = {};
      for (const s of approved) {
        productCount[s.product_id] = (productCount[s.product_id] || 0) + 1;
      }
      const topProductId = Object.entries(productCount).sort((a, b) => b[1] - a[1])[0];
      let topProduct = null;
      if (topProductId) {
        const { data: prod } = await supabaseAdmin.from("products").select("nome, preco").eq("id", topProductId[0]).single();
        topProduct = prod ? { nome: prod.nome, preco: prod.preco, sales_count: topProductId[1] } : null;
      }

      // Ranking
      const { data: allSales } = await supabaseAdmin.from("sales").select("user_id, valor, status");
      const sellerTotals: Record<string, number> = {};
      for (const s of (allSales || []).filter(s => s.status === "approved")) {
        sellerTotals[s.user_id] = (sellerTotals[s.user_id] || 0) + Number(s.valor);
      }
      const sorted = Object.entries(sellerTotals).sort((a, b) => b[1] - a[1]);
      const rank = sorted.findIndex(([id]) => id === uid) + 1;

      return new Response(JSON.stringify({
        total_revenue: totalRevenue,
        total_sales: totalSales,
        top_product: topProduct,
        rank: rank || null,
        total_sellers: sorted.length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // UPDATE USER STATUS
    if (action === "update_user_status") {
      const { error } = await supabaseAdmin.from("profiles").update({ status: body.status }).eq("user_id", body.user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // LIST PRODUCTS
    if (action === "list_products") {
      const { data: prods } = await supabaseAdmin.from("products").select("*").order("created_at", { ascending: false });
      // Enrich with seller info
      const userIds = [...new Set((prods || []).map(p => p.user_id))];
      const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id, nome, email").in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      const enriched = (prods || []).map(p => ({ ...p, seller_name: profileMap[p.user_id]?.nome || "—", seller_email: profileMap[p.user_id]?.email || "—" }));
      return new Response(JSON.stringify(enriched), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE PRODUCT STATUS
    if (action === "update_product_status") {
      const { error } = await supabaseAdmin.from("products").update({ status: body.status }).eq("id", body.product_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // LIST WITHDRAWALS
    if (action === "list_withdrawals") {
      const { data: withdrawals } = await supabaseAdmin.from("withdrawals").select("*").order("created_at", { ascending: false });
      const userIds = [...new Set((withdrawals || []).map(w => w.user_id))];
      const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id, nome, email").in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      const enriched = (withdrawals || []).map(w => ({ ...w, user_name: profileMap[w.user_id]?.nome || "—", user_email: profileMap[w.user_id]?.email || "—" }));
      return new Response(JSON.stringify(enriched), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE WITHDRAWAL STATUS
    if (action === "update_withdrawal_status") {
      const { error } = await supabaseAdmin.from("withdrawals").update({ status: body.status }).eq("id", body.withdrawal_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // LIST ORDERS (sales)
    if (action === "list_orders") {
      const { data: sales } = await supabaseAdmin.from("sales").select("*").order("created_at", { ascending: false });
      const userIds = [...new Set((sales || []).map(s => s.user_id))];
      const productIds = [...new Set((sales || []).map(s => s.product_id))];
      const [{ data: profiles }, { data: products }] = await Promise.all([
        supabaseAdmin.from("profiles").select("user_id, nome, email").in("user_id", userIds),
        supabaseAdmin.from("products").select("id, nome, image_url").in("id", productIds),
      ]);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      const productMap = Object.fromEntries((products || []).map(p => [p.id, p]));
      const enriched = (sales || []).map(s => ({
        ...s,
        seller_name: profileMap[s.user_id]?.nome || "—",
        seller_email: profileMap[s.user_id]?.email || "—",
        product_name: productMap[s.product_id]?.nome || "—",
        product_image: productMap[s.product_id]?.image_url || null,
      }));
      return new Response(JSON.stringify(enriched), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE ORDER STATUS
    if (action === "update_order_status") {
      const { error } = await supabaseAdmin.from("sales").update({ status: body.status }).eq("id", body.order_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // LOGOUT
    if (action === "logout") {
      await supabaseAdmin.from("admin_sessions").delete().eq("session_token", session_token);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
