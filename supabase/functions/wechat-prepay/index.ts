import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {
  PAYMENT_UNAVAILABLE_ERROR,
  buildDevelopmentMockPayment,
  normalizeMockPoints,
  resolvePaymentGatewayPolicy,
} from './core.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (body: unknown, status: number) => new Response(
  JSON.stringify(body),
  {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  },
);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } }, 405);
  }

  const policy = resolvePaymentGatewayPolicy(
    Deno.env.get('APP_RUNTIME_MODE'),
    Deno.env.get('PAYMENT_GATEWAY_MODE'),
  );

  if (!policy.available) {
    return jsonResponse({ error: PAYMENT_UNAVAILABLE_ERROR }, 503);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authHeader = request.headers.get('Authorization');

  if (!supabaseUrl || !anonKey) {
    return jsonResponse({
      error: { code: 'AUTH_CONTEXT_UNAVAILABLE', message: 'Authentication is unavailable.' },
    }, 503);
  }

  if (!authHeader) {
    return jsonResponse({ error: { code: 'AUTH_REQUIRED', message: 'Authentication is required.' } }, 401);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return jsonResponse({ error: { code: 'AUTH_REQUIRED', message: 'Authentication is required.' } }, 401);
  }

  let points: number;
  try {
    const body = await request.json();
    points = normalizeMockPoints(body?.points);
  } catch {
    return jsonResponse({ error: { code: 'INVALID_REQUEST', message: 'Invalid points amount.' } }, 400);
  }

  const mockId = `mock_${crypto.randomUUID()}`;
  return jsonResponse(buildDevelopmentMockPayment(points, mockId), 200);
});
