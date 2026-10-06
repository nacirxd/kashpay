import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { TOTP, Secret } from "https://esm.sh/otpauth@9.3.6";
import { sendAppEmail } from '../_shared/sendAppEmail.ts'

const EXCHANGE_RATE_URL = 'https://open.er-api.com/v6/latest/MZN';
const TSEMBA_SMS_URL = 'https://hdxqelinqivwgmggolhs.supabase.co/functions/v1/api-gateway/sms/send';

async function convertMznToBrlCents(amountMzn: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const resp = await fetch(EXCHANGE_RATE_URL, { signal: ctrl.signal });
    const data = await resp.json();
    const rate = Number(data?.rates?.BRL);
    if (!resp.ok || !Number.isFinite(rate) || rate <= 0) throw new Error('Falha cotação');
    return { rate, cents: Math.round(amountMzn * rate * 100) };
  } finally {
    clearTimeout(t);
  }
}

function normalizePhoneMZ(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('258') && digits.length === 12) return `+${digits}`;
  if (digits.length === 9 && digits.startsWith('8')) return `+258${digits}`;
  if (digits.startsWith('+')) return digits;
  return null;
}

async function sendTsembaSMS(apiKey: string, senderId: string | null, to: string, message: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const body: Record<string, string> = { to, message };
    if (senderId) body.sender_id = senderId;
    const resp = await fetch(TSEMBA_SMS_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    console.log('Tsemba SMS (admin) response:', resp.status, text);
    return resp.ok;
  } catch (err) {
    console.error('Erro Tsemba SMS (admin):', err);
    return false;
  } finally {
    clearTimeout(t);
  }
}

const DEFAULT_SMS_WEBHOOK_URL = 'https://zenofyetsembasms.online/api/public/tsemba/webhook';

async function notifySmsWebhook(url: string, payload: Record<string, unknown>) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log('SMS webhook (admin) response:', resp.status, await resp.text());
    return resp.ok;
  } catch (err) {
    console.error('Erro no SMS webhook (admin):', err);
    return false;
  } finally {
    clearTimeout(t);
  }
}
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

      // Verify TOTP 2FA
      const totpSecret = Deno.env.get("ADMIN_TOTP_SECRET");
      if (totpSecret) {
        try {
          const secret = Secret.fromUTF8(totpSecret);
          const totp = new TOTP({ secret, digits: 6, period: 30 });
          const generated = totp.generate();
          const userCode = (body.totp_code || "").toString().trim();
          console.log("TOTP generated length:", generated.length, "user code length:", userCode.length);
          if (userCode !== generated) {
            // Also check previous and next window
            const now = Math.floor(Date.now() / 1000);
            const totp_prev = new TOTP({ secret, digits: 6, period: 30 });
            const prev = totp_prev.generate({ timestamp: (now - 30) * 1000 });
            const next = totp_prev.generate({ timestamp: (now + 30) * 1000 });
            if (userCode !== prev && userCode !== next) {
              return new Response(JSON.stringify({ error: "Código 2FA inválido" }), {
                status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
        } catch (e) {
          console.error("TOTP error:", e.message);
          return new Response(JSON.stringify({ error: "Erro na validação 2FA: " + e.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
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

    // UPDATE PRODUCT ZENOFY ID
    if (action === "update_product_zenofy_id") {
      const zenofyId = typeof body.zenofy_product_id === "string" ? body.zenofy_product_id.trim() : "";
      const { error } = await supabaseAdmin.from("products").update({ zenofy_product_id: zenofyId || null }).eq("id", body.product_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE PRODUCT (admin edit — full owner-level edit)
    if (action === "update_product") {
      const productId = typeof body.product_id === "string" ? body.product_id : "";
      if (!productId) throw new Error("Produto inválido");
      const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
      const updates: Record<string, unknown> = {};
      if (body.nome !== undefined) {
        const nome = str(body.nome);
        if (!nome) throw new Error("Nome não pode ficar vazio");
        if (nome.length > 200) throw new Error("Nome muito longo");
        updates.nome = nome;
      }
      if (body.descricao !== undefined) updates.descricao = str(body.descricao).slice(0, 5000);
      if (body.preco !== undefined) {
        const preco = Number(body.preco);
        if (!Number.isFinite(preco) || preco <= 0) throw new Error("Preço inválido");
        updates.preco = preco;
      }
      if (body.categoria !== undefined) updates.categoria = str(body.categoria).slice(0, 120);
      if (body.currency !== undefined) {
        const cur = str(body.currency).toUpperCase();
        if (!["MZN", "AOA"].includes(cur)) throw new Error("Moeda inválida");
        updates.currency = cur;
      }
      if (body.delivery_type !== undefined) {
        const dt = str(body.delivery_type);
        if (!["link", "file"].includes(dt)) throw new Error("Tipo de entrega inválido");
        updates.delivery_type = dt;
      }
      if (body.payment_methods !== undefined) {
        const allowedPm = ["zenofy", "mpesa", "emola", "mcx", "ref"];
        const pm = Array.isArray(body.payment_methods)
          ? body.payment_methods.map((m: unknown) => str(m)).filter((m: string) => allowedPm.includes(m))
          : [];
        if (pm.length === 0) throw new Error("Escolha pelo menos um método de pagamento");
        updates.payment_methods = [...new Set(pm)];
      }
      // Cross-check payment methods against the effective currency so a
      // product can never be saved with methods that don't match its country.
      if (updates.payment_methods !== undefined || updates.currency !== undefined) {
        let effectiveCurrency = (updates.currency as string | undefined) || "";
        if (!effectiveCurrency) {
          const { data: cur } = await supabaseAdmin
            .from("products")
            .select("currency")
            .eq("id", productId)
            .maybeSingle();
          effectiveCurrency = (cur?.currency as string) || "MZN";
        }
        const byCountry = effectiveCurrency === "AOA" ? ["mcx", "ref"] : ["zenofy", "mpesa", "emola"];
        if (updates.payment_methods !== undefined) {
          const filtered = (updates.payment_methods as string[]).filter((m) => byCountry.includes(m));
          if (filtered.length === 0) {
            throw new Error("Os métodos de pagamento não correspondem à moeda do produto");
          }
          updates.payment_methods = filtered;
        }
      }
      if (body.status !== undefined) {
        const st = str(body.status);
        if (!["pending", "approved", "rejected"].includes(st)) throw new Error("Status inválido");
        updates.status = st;
      }
      if (body.image_url !== undefined) updates.image_url = str(body.image_url) || null;
      if (body.file_url !== undefined) updates.file_url = str(body.file_url) || null;
      if (body.support_phone !== undefined) updates.support_phone = str(body.support_phone).slice(0, 40);
      if (body.support_email !== undefined) updates.support_email = str(body.support_email).slice(0, 255);
      if (body.meta_pixel_id !== undefined) updates.meta_pixel_id = str(body.meta_pixel_id).slice(0, 100);
      if (body.meta_access_token !== undefined) updates.meta_access_token = str(body.meta_access_token).slice(0, 500);
      if (body.webhook_url !== undefined) updates.webhook_url = str(body.webhook_url) || null;
      if (body.zenofy_product_id !== undefined) updates.zenofy_product_id = str(body.zenofy_product_id) || null;
      if (body.external_url !== undefined) updates.external_url = str(body.external_url) || null;
      if (body.upsell_url !== undefined) updates.upsell_url = str(body.upsell_url) || null;
      if (body.downsell_url !== undefined) updates.downsell_url = str(body.downsell_url) || null;
      if (body.order_bumps !== undefined) {
        const raw = Array.isArray(body.order_bumps) ? body.order_bumps : [];
        const bumps = raw
          .map((b: any) => {
            const pid = str(b?.product_id);
            if (!pid) return null;
            const priceRaw = b?.price;
            let price: number | null = null;
            if (priceRaw !== null && priceRaw !== undefined && str(String(priceRaw)) !== "") {
              const n = Number(priceRaw);
              if (!Number.isFinite(n) || n < 0) throw new Error("Preço da oferta extra inválido");
              price = n;
            }
            return {
              product_id: pid,
              price,
              title: str(b?.title).slice(0, 200),
              description: str(b?.description).slice(0, 500),
            };
          })
          .filter(Boolean);
        updates.order_bumps = bumps;
        const first: any = bumps[0] || null;
        updates.order_bump_product_id = first?.product_id || null;
        updates.order_bump_price = first?.price ?? null;
        updates.order_bump_title = first?.title || null;
        updates.order_bump_description = first?.description || null;
      }
      if (Object.keys(updates).length === 0) throw new Error("Nada para atualizar");
      const { error } = await supabaseAdmin.from("products").update(updates).eq("id", productId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET GLOBAL SETTINGS
    if (action === "get_settings") {
      const { data } = await supabaseAdmin.from("app_settings").select("key, value");
      const map = Object.fromEntries((data || []).map((r: any) => [r.key, r.value]));
      return new Response(JSON.stringify(map), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE GLOBAL SETTING
    if (action === "update_setting") {
      const key = typeof body.key === "string" ? body.key.trim() : "";
      const allowed = ["zenofy_product_id", "sms_webhook_url", "mpesa_enabled", "emola_enabled"];
      if (!allowed.includes(key)) throw new Error("Configuração inválida");
      const value = typeof body.value === "string" ? body.value.trim() : "";
      const { error } = await supabaseAdmin
        .from("app_settings")
        .upsert({ key, value: value || null, updated_at: new Date().toISOString() }, { onConflict: "key" });
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

      // Send withdrawal notification email to seller
      if (body.status === "aprovado" || body.status === "rejeitado") {
        try {
          const { data: withdrawal } = await supabaseAdmin.from("withdrawals").select("*").eq("id", body.withdrawal_id).single();
          if (withdrawal) {
            const { data: profile } = await supabaseAdmin.from("profiles").select("nome, email").eq("user_id", withdrawal.user_id).maybeSingle();
            if (profile?.email) {
              await sendAppEmail(supabaseAdmin, "withdrawal-notification", profile.email, {
            templateData: {
                    sellerName: profile.nome || undefined,
                    amount: `${Number(withdrawal.valor).toLocaleString("pt-MZ")} MT`,
                    method: withdrawal.metodo,
                    account: withdrawal.conta,
                    status: body.status,
                  },
            idempotencyKey: `withdrawal-notify-${body.withdrawal_id}-${body.status}`,
          });
              console.log("Notificação de saque enviada para:", profile.email);
            }
          }
        } catch (wErr) {
          console.error("Erro ao notificar saque:", wErr);
        }
      }

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

      // When marking as approved, fire emails + UTMify (wrapped so errors don't break the response)
      if (body.status === "approved") {
        try {
        // Fetch sale + product details
        const { data: sale } = await supabaseAdmin.from("sales").select("*").eq("id", body.order_id).single();
        if (sale) {
          const { data: product } = await supabaseAdmin.from("products").select("*").eq("id", sale.product_id).single();

          // Fetch seller profile for contact info and notifications
          const { data: sellerProfile } = await supabaseAdmin
            .from("profiles")
            .select("nome, email, telefone, mpesa_telefone")
            .eq("user_id", sale.user_id)
            .maybeSingle();

          // 1. Send purchase confirmation email
          if (sale.buyer_email) {
            try {
              await sendAppEmail(supabaseAdmin, "purchase-confirmation", sale.buyer_email, {
            templateData: {
                    buyerName: sale.buyer_name || undefined,
                    productName: product?.nome || "Produto",
                    amount: `${Number(sale.valor).toLocaleString("pt-MZ")} MT`,
                    paymentMethod: sale.payment_method || undefined,
                    accessUrl: product?.delivery_type === "link" ? product.external_url : undefined,
                    accessType: product?.delivery_type || "link",
                    sellerName: sellerProfile?.nome || undefined,
                    sellerEmail: sellerProfile?.email || undefined,
                    sellerWhatsapp: sellerProfile?.telefone || sellerProfile?.mpesa_telefone || undefined,
                  },
            idempotencyKey: `purchase-confirm-admin-${sale.id}`,
          });
              console.log("Email de compra enviado para:", sale.buyer_email);
            } catch (emailErr) {
              console.error("Erro ao enviar email de compra:", emailErr);
            }
          }

          // 2. Send sale notification to seller
          if (sellerProfile?.email) {
            try {
              await sendAppEmail(supabaseAdmin, "sale-notification", sellerProfile.email, {
            templateData: {
                    sellerName: sellerProfile.nome || undefined,
                    productName: product?.nome || "Produto",
                    amount: `${Number(sale.valor).toLocaleString("pt-MZ")} MT`,
                    buyerName: sale.buyer_name || undefined,
                    buyerEmail: sale.buyer_email || undefined,
                    paymentMethod: sale.payment_method || undefined,
                  },
            idempotencyKey: `sale-notify-admin-${sale.id}`,
          });
              console.log("Notificação de venda enviada para vendedor:", sellerProfile.email);
            } catch (sellerErr) {
              console.error("Erro ao notificar vendedor:", sellerErr);
            }
          }

          // 3. Fire UTMify event
          try {
            const { data: utmifyIntegration } = await supabaseAdmin
              .from("integrations")
              .select("config, ativo")
              .eq("user_id", sale.user_id)
              .eq("tipo", "utmify")
              .eq("ativo", true)
              .maybeSingle();

            if (utmifyIntegration?.config) {
              const config = utmifyIntegration.config as any;
              const apiToken = config.api_token || config.token;
              if (apiToken && sale.buyer_name && sale.buyer_email) {
                const { rate, cents } = await convertMznToBrlCents(Number(sale.valor));
                console.log("UTMify admin: cotação MZN→BRL:", rate);
                const utmCtrl = new AbortController();
                const utmT = setTimeout(() => utmCtrl.abort(), 8000);
                const utmifyResp = await fetch("https://api.utmify.com.br/api-credentials/orders", {
                  method: "POST",
                  signal: utmCtrl.signal,
                  headers: { "Content-Type": "application/json", "x-api-token": apiToken },
                  body: JSON.stringify({
                    orderId: sale.id,
                    platform: "MoonPay",
                    paymentMethod: "unknown",
                    status: "paid",
                    createdAt: new Date().toISOString(),
                    approvedDate: new Date().toISOString(),
                    customer: {
                      name: sale.buyer_name,
                      email: sale.buyer_email,
                      phone: sale.payment_phone || sale.buyer_whatsapp || null,
                      document: null,
                    },
                    products: [{
                      id: product?.id || sale.product_id,
                      name: product?.nome || "Produto",
                      planId: product?.id || sale.product_id,
                      planName: product?.nome || "Produto digital",
                      quantity: 1,
                      priceInCents: cents,
                    }],
                    trackingParameters: {
                      src: sale.utm_source || null,
                      utm_source: sale.utm_source || null,
                      utm_medium: sale.utm_medium || null,
                      utm_campaign: sale.utm_campaign || null,
                      utm_content: sale.utm_content || null,
                      utm_term: null,
                    },
                    commission: {
                      totalPriceInCents: cents,
                      gatewayFeeInCents: 0,
                      userCommissionInCents: cents,
                      currency: "BRL",
                    },
                  }),
                });
                clearTimeout(utmT);
                console.log("UTMify admin response:", utmifyResp.status, await utmifyResp.text());
              }
            }
          } catch (utmErr) {
            console.error("Erro UTMify admin:", utmErr);
          }

          // 4. Tsemba SMS GLOBAL (secrets do admin)
          try {
            const apiKey = Deno.env.get("TSEMBA_API_KEY") || "";
            const senderId = Deno.env.get("TSEMBA_SENDER_ID") || null;
            const buyerPhone = sale.buyer_whatsapp || sale.payment_phone || "";
            const normalized = normalizePhoneMZ(buyerPhone);
            const firstName = String(sale.buyer_name || "").split(" ")[0];
            const valorFormatado = `${Number(sale.valor).toLocaleString("pt-MZ")} MT`;
            const message = `Ola ${firstName}, confirmamos sua compra de ${valorFormatado}. Duvidas? Fale conosco no WhatsApp: 864381528`;

            if (apiKey && normalized && sale.buyer_name) {
              const sent = await sendTsembaSMS(apiKey, senderId, normalized, message);
              await supabaseAdmin.from("sms_logs").insert({
                user_id: sale.user_id,
                sale_id: sale.id,
                provider: "tsemba",
                recipient_phone: normalized,
                sender_id: senderId,
                message,
                status: sent ? "sent" : "failed",
                provider_response: sent ? "Pedido aceite pela Tsemba" : null,
                error_message: sent ? null : "Falha ao enviar SMS pela Tsemba",
              });
            } else {
              const reason = !apiKey ? "TSEMBA_API_KEY nao configurado" : "Faltam telefone valido ou nome do comprador";
              console.log("Tsemba SMS (admin) ignorado:", reason);
              await supabaseAdmin.from("sms_logs").insert({
                user_id: sale.user_id,
                sale_id: sale.id,
                provider: "tsemba",
                recipient_phone: normalized || buyerPhone || "indisponivel",
                sender_id: senderId,
                message,
                status: "failed",
                provider_response: null,
                error_message: reason,
              });
            }
          } catch (smsErr) {
            console.error("Erro Tsemba SMS (admin):", smsErr);
          }

          // 5. Sistema de SMS externo: aviso de venda aprovada
          try {
            const { data: smsSetting } = await supabaseAdmin
              .from("app_settings")
              .select("value")
              .eq("key", "sms_webhook_url")
              .maybeSingle();
            const smsUrl = (smsSetting?.value || "").toString().trim() || DEFAULT_SMS_WEBHOOK_URL;
            if (/^https?:\/\//.test(smsUrl)) {
              await notifySmsWebhook(smsUrl, {
                event: "sale.approved",
                sale_id: sale.id,
                product_id: sale.product_id,
                product_name: product?.nome || null,
                seller_id: sale.user_id,
                amount: Number(sale.valor),
                currency: (product as any)?.currency || "MZN",
                payment_method: sale.payment_method || null,
                buyer_name: sale.buyer_name || null,
                buyer_email: sale.buyer_email || null,
                buyer_phone: normalizePhoneMZ(sale.buyer_whatsapp || sale.payment_phone || "") || sale.buyer_whatsapp || null,
                support_phone: (product as any)?.support_phone || null,
                created_at: new Date().toISOString(),
              });
            }
          } catch (smsHookErr) {
            console.error("Erro ao avisar sistema de SMS (admin):", smsHookErr);
          }
        }
        } catch (bgErr) {
          console.error("Erro no processamento pós-aprovação:", bgErr);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // LIST SMS LOGS (todos os utilizadores)
    if (action === "list_sms_logs") {
      const { data: logs } = await supabaseAdmin
        .from("sms_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      const userIds = [...new Set((logs || []).map((l: any) => l.user_id))];
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, nome, email")
        .in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
      const enriched = (logs || []).map((l: any) => ({
        ...l,
        seller_name: profileMap[l.user_id]?.nome || "—",
        seller_email: profileMap[l.user_id]?.email || "—",
      }));
      return new Response(JSON.stringify(enriched), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SEND TEST SMS
    if (action === "send_test_sms") {
      const apiKey = Deno.env.get("TSEMBA_API_KEY") || "";
      const senderId = Deno.env.get("TSEMBA_SENDER_ID") || null;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "TSEMBA_API_KEY nao configurado nos secrets" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const phone = normalizePhoneMZ(String(body.phone || ""));
      if (!phone) {
        return new Response(JSON.stringify({ error: "Numero de telefone invalido (use formato MZ)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const message = String(body.message || "Teste de SMS KashPay - integracao Tsemba ativa.");
      const sent = await sendTsembaSMS(apiKey, senderId, phone, message);
      return new Response(JSON.stringify({ success: sent, sender_id: senderId, phone, message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET 2FA SETUP
    if (action === "get_2fa_setup") {
      const totpSecret = Deno.env.get("ADMIN_TOTP_SECRET");
      if (!totpSecret) {
        return new Response(JSON.stringify({ error: "TOTP secret não configurado" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const secret = Secret.fromUTF8(totpSecret);
      const totp = new TOTP({ issuer: "KashPay Admin", label: "admin", secret, digits: 6, period: 30 });
      const uri = totp.toString();
      return new Response(JSON.stringify({ manual_key: secret.base32, uri }), {
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
