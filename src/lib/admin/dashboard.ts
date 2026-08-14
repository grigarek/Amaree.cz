import "server-only";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminOrderStatus } from "@/lib/orders/statuses";

type DashboardOrderRow = {
  id: string;
  order_number: string;
  status: AdminOrderStatus;
  currency: "CZK" | "EUR";
  customer_first_name: string;
  customer_last_name: string;
  total_minor: number;
  created_at: string;
};

export type DashboardMetrics = {
  ordersTotal: number;
  ordersLast30Days: number;
  actionRequired: number;
  turnover: Record<"CZK" | "EUR", number>;
  openOrderValue: Record<"CZK" | "EUR", number>;
  statusCounts: Partial<Record<AdminOrderStatus, number>>;
  topProducts: Array<{ sku: string; name: string; quantity: number }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customer: string;
    status: AdminOrderStatus;
    totalMinor: number;
    currency: "CZK" | "EUR";
    createdAt: string;
  }>;
  emailIssues: number;
};

const emptyMetrics: DashboardMetrics = {
  ordersTotal: 0,
  ordersLast30Days: 0,
  actionRequired: 0,
  turnover: { CZK: 0, EUR: 0 },
  openOrderValue: { CZK: 0, EUR: 0 },
  statusCounts: {},
  topProducts: [],
  recentOrders: [],
  emailIssues: 0
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  if (!isSupabaseConfigured()) return emptyMetrics;
  const supabase = await createSupabaseServerClient();
  const [ordersResult, itemsResult, emailIssuesResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id,order_number,status,currency,customer_first_name,customer_last_name,total_minor,created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("order_items").select("order_id,sku,name_snapshot,quantity").limit(2000),
    supabase.from("email_messages").select("id", { count: "exact", head: true }).in("status", ["failed", "queued"])
  ]);
  if (ordersResult.error) throw new Error(`Dashboard orders could not be loaded: ${ordersResult.error.message}`);
  if (itemsResult.error) throw new Error(`Dashboard products could not be loaded: ${itemsResult.error.message}`);

  const orders = (ordersResult.data ?? []) as DashboardOrderRow[];
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const settledStatuses = new Set<AdminOrderStatus>(["paid", "processing", "ready_for_pickup", "shipped", "delivered"]);
  const openStatuses = new Set<AdminOrderStatus>(["new", "awaiting_payment", "paid", "processing", "ready_for_pickup", "shipped"]);
  const actionStatuses = new Set<AdminOrderStatus>(["new", "paid", "processing", "ready_for_pickup"]);
  const validOrderIds = new Set(orders.filter((order) => !["cancelled", "refunded", "archived"].includes(order.status)).map((order) => order.id));
  const turnover = { CZK: 0, EUR: 0 };
  const openOrderValue = { CZK: 0, EUR: 0 };
  const statusCounts: DashboardMetrics["statusCounts"] = {};

  for (const order of orders) {
    statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1;
    if (settledStatuses.has(order.status)) turnover[order.currency] += Number(order.total_minor);
    if (openStatuses.has(order.status)) openOrderValue[order.currency] += Number(order.total_minor);
  }

  const products = new Map<string, { sku: string; name: string; quantity: number }>();
  for (const item of itemsResult.data ?? []) {
    if (!validOrderIds.has(String(item.order_id))) continue;
    const names = item.name_snapshot as Record<string, string>;
    const key = String(item.sku);
    const current = products.get(key) ?? { sku: key, name: names.cs ?? Object.values(names)[0] ?? "Produkt", quantity: 0 };
    current.quantity += Number(item.quantity);
    products.set(key, current);
  }

  return {
    ordersTotal: orders.length,
    ordersLast30Days: orders.filter((order) => new Date(order.created_at).getTime() >= thirtyDaysAgo).length,
    actionRequired: orders.filter((order) => actionStatuses.has(order.status)).length,
    turnover,
    openOrderValue,
    statusCounts,
    topProducts: [...products.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
    recentOrders: orders.slice(0, 5).map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      customer: `${order.customer_first_name} ${order.customer_last_name}`,
      status: order.status,
      totalMinor: Number(order.total_minor),
      currency: order.currency,
      createdAt: order.created_at
    })),
    emailIssues: emailIssuesResult.count ?? 0
  };
}

export type TrafficSummary = {
  configured: boolean;
  visitsToday: number | null;
  visits7Days: number | null;
  pageViewsToday: number | null;
  pageViews7Days: number | null;
  requests7Days: number | null;
  daily: Array<{ date: string; visits: number; pageViews: number; requests: number }>;
  error: boolean;
};

export async function getCloudflareTrafficSummary(): Promise<TrafficSummary> {
  const token = process.env.CLOUDFLARE_ANALYTICS_API_TOKEN?.trim();
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  if (!token || !accountId || !zoneId) {
    return { configured: false, visitsToday: null, visits7Days: null, pageViewsToday: null, pageViews7Days: null, requests7Days: null, daily: [], error: false };
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const days = Array.from({ length: 7 }, (_, index) => {
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - (6 - index));
    const nextDay = new Date(start);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const end = nextDay.getTime() > now.getTime() ? now : new Date(nextDay.getTime() - 1);
    return { date: start.toISOString().slice(0, 10), start, end };
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const rumFilterVariables = days.map((_, index) => `$rumFilter${index}: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject`).join(", ");
    const httpFilterVariables = days.map((_, index) => `$httpFilter${index}: ZoneHttpRequestsAdaptiveGroupsFilter_InputObject`).join(", ");
    const rumDailyFields = days.map((_, index) => `day${index}: rumPageloadEventsAdaptiveGroups(limit: 1, filter: $rumFilter${index}) { count sum { visits } }`).join(" ");
    const httpDailyFields = days.map((_, index) => `day${index}: httpRequestsAdaptiveGroups(limit: 1, filter: $httpFilter${index}) { count }`).join(" ");
    const rumVariables = Object.fromEntries(days.map((day, index) => [`rumFilter${index}`, {
      datetime_geq: day.start.toISOString(),
      datetime_leq: day.end.toISOString(),
      requestHost: "amaree.cz"
    }]));
    const httpVariables = Object.fromEntries(days.map((day, index) => [`httpFilter${index}`, {
      datetime_geq: day.start.toISOString(),
      datetime_leq: day.end.toISOString(),
      requestSource: "eyeball"
    }]));
    const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query Traffic($accountTag: string, $zoneTag: string, ${rumFilterVariables}, ${httpFilterVariables}) { viewer { accounts(filter: { accountTag: $accountTag }) { ${rumDailyFields} } zones(filter: { zoneTag: $zoneTag }) { ${httpDailyFields} } } }`,
        variables: { accountTag: accountId, zoneTag: zoneId, ...rumVariables, ...httpVariables }
      }),
      cache: "no-store",
      signal: controller.signal
    });
    type DailyRumTraffic = { count?: number; sum?: { visits?: number } };
    type DailyHttpTraffic = { count?: number };
    const payload = await response.json() as {
      data?: { viewer?: {
        accounts?: Array<Record<string, DailyRumTraffic[] | undefined>>;
        zones?: Array<Record<string, DailyHttpTraffic[] | undefined>>;
      } };
      errors?: unknown[] | null;
    };
    const account = payload.data?.viewer?.accounts?.[0];
    const zone = payload.data?.viewer?.zones?.[0];
    if (!response.ok || payload.errors?.length || !account || !zone) throw new Error("cloudflare_analytics_unavailable");
    const daily = days.map((day, index) => {
      const rumTraffic = account[`day${index}`]?.[0];
      const httpTraffic = zone[`day${index}`]?.[0];
      return {
        date: day.date,
        visits: Number(rumTraffic?.sum?.visits ?? 0),
        pageViews: Number(rumTraffic?.count ?? 0),
        requests: Number(httpTraffic?.count ?? 0)
      };
    });
    return {
      configured: true,
      visitsToday: daily.at(-1)?.visits ?? 0,
      visits7Days: daily.reduce((sum, day) => sum + day.visits, 0),
      pageViewsToday: daily.at(-1)?.pageViews ?? 0,
      pageViews7Days: daily.reduce((sum, day) => sum + day.pageViews, 0),
      requests7Days: daily.reduce((sum, day) => sum + day.requests, 0),
      daily,
      error: false
    };
  } catch {
    return { configured: true, visitsToday: null, visits7Days: null, pageViewsToday: null, pageViews7Days: null, requests7Days: null, daily: [], error: true };
  } finally {
    clearTimeout(timeout);
  }
}

export type EngagementSummary = {
  configured: boolean;
  sessions: number;
  pageViews: number;
  averageSeconds: number;
  topPages: Array<{ path: string; pageViews: number; averageSeconds: number }>;
  error: boolean;
};

export async function getStorefrontEngagementSummary(): Promise<EngagementSummary> {
  if (!isSupabaseConfigured()) return { configured: false, sessions: 0, pageViews: 0, averageSeconds: 0, topPages: [], error: false };
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await createSupabaseAdminClient()
      .from("storefront_analytics_events")
      .select("session_id,event_type,path,duration_seconds")
      .gte("created_at", since)
      .limit(10000);
    if (error) throw error;
    const sessions = new Set<string>();
    const pages = new Map<string, { pageViews: number; duration: number; engagementEvents: number }>();
    let totalDuration = 0;
    let engagementEvents = 0;
    for (const event of data ?? []) {
      sessions.add(String(event.session_id));
      const path = String(event.path);
      const current = pages.get(path) ?? { pageViews: 0, duration: 0, engagementEvents: 0 };
      if (event.event_type === "page_view") current.pageViews += 1;
      if (event.event_type === "page_engagement") {
        const duration = Number(event.duration_seconds) || 0;
        current.duration += duration;
        current.engagementEvents += 1;
        totalDuration += duration;
        engagementEvents += 1;
      }
      pages.set(path, current);
    }
    return {
      configured: true,
      sessions: sessions.size,
      pageViews: [...pages.values()].reduce((sum, page) => sum + page.pageViews, 0),
      averageSeconds: engagementEvents ? Math.round(totalDuration / engagementEvents) : 0,
      topPages: [...pages.entries()]
        .map(([path, page]) => ({ path, pageViews: page.pageViews, averageSeconds: page.engagementEvents ? Math.round(page.duration / page.engagementEvents) : 0 }))
        .sort((a, b) => b.pageViews - a.pageViews || b.averageSeconds - a.averageSeconds)
        .slice(0, 6),
      error: false
    };
  } catch {
    return { configured: true, sessions: 0, pageViews: 0, averageSeconds: 0, topPages: [], error: true };
  }
}
