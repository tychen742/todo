const SUPABASE_ENDPOINTS = [
  { name: 'profiles', path: '/rest/v1/profiles?select=id&limit=1' },
  { name: 'todos', path: '/rest/v1/todos?select=id&limit=1' },
];

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
    Prefer: 'count=none',
  };

  const checks = await Promise.all(
    SUPABASE_ENDPOINTS.map(async (endpoint) => {
      const startedAt = Date.now();
      const url = `${config.supabaseUrl}${endpoint.path}`;

      try {
        const supabaseResponse = await fetch(url, { headers });
        await supabaseResponse.arrayBuffer();

        return {
          name: endpoint.name,
          status: supabaseResponse.status,
          ok: supabaseResponse.ok,
          durationMs: Date.now() - startedAt,
        };
      } catch (error) {
        return {
          name: endpoint.name,
          status: null,
          ok: false,
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),
  );

  const reachedSupabase = checks.some(
    (check) => typeof check.status === 'number' && check.status < 500,
  );

  return response.status(reachedSupabase ? 200 : 502).json({
    ok: reachedSupabase,
    checkedAt: new Date().toISOString(),
    checks,
  });
};
