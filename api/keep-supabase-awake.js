const HEARTBEAT_RPC_PATH = '/rest/v1/rpc/touch_supabase_heartbeat';

function getSupabaseConfig() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { error: 'Missing Supabase URL or anon key environment variable.' };
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/+$/, ''),
    supabaseKey,
  };
}

module.exports = async function keepSupabaseAwake(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (!['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const config = getSupabaseConfig();

  if (config.error) {
    return response.status(500).json({ error: config.error });
  }

  const headers = {
    apikey: config.supabaseKey,
    Authorization: `Bearer ${config.supabaseKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const startedAt = Date.now();

  try {
    const supabaseResponse = await fetch(
      `${config.supabaseUrl}${HEARTBEAT_RPC_PATH}`,
      {
        method: 'POST',
        headers,
        body: '{}',
      },
    );
    const heartbeat = await supabaseResponse.json().catch(() => null);

    return response.status(supabaseResponse.ok ? 200 : 502).json({
      ok: supabaseResponse.ok,
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      status: supabaseResponse.status,
      heartbeat,
    });
  } catch (error) {
    return response.status(502).json({
      ok: false,
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
