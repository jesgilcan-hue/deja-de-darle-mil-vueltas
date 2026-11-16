// Utilidad compartida para Lulu Direct API (Sandbox y Producción)

const SANDBOX_AUTH_BASIC =
  process.env.LULU_SANDBOX_AUTH_BASIC ||
  'Basic ZDU4NDhiMWQtMmQ3Zi00OGJiLThmODAtNmYzYjM2ZTM4NGRkOmFCZlV0TDRGMHJzMDFPNUN0WFBpVTVkRHlUbjlBUXExUFFuYmdMaWNUNnc0RjFrT2VFY1ZmcUtXZDZXdzdXTTBERUxIWHp4UUVBS3Nhem1JU2RPdDJN';

const PROD_AUTH_BASIC =
  process.env.LULU_AUTH_BASIC ||
  'Basic MDQzYjg2NWUtNjRmNC00MzA0LTg5ZTctZTJmZDMzNWI0ZjQwOmpDSkJhMXJVOUNKSnpOMHEzd29ZSEk5MFNSS3czRVM4NmdNWHZmeko0OFRuR0NnOGxZVG5JZkRkUDdZWjI5cHRwOE5pVjVvTGFSSnFUemRGeGN0U0JQ';

export function resolveLuluEnv(requestedEnv) {
  const raw = (requestedEnv || process.env.LULU_ENV || 'sandbox').toString().toLowerCase().trim();
  return raw === 'production' || raw === 'prod' || raw === 'live' ? 'production' : 'sandbox';
}

export function getLuluConfig(requestedEnv) {
  const env = resolveLuluEnv(requestedEnv);
  if (env === 'production') {
    return {
      env: 'production',
      baseUrl: 'https://api.lulu.com',
      authBasic: PROD_AUTH_BASIC
    };
  }
  return {
    env: 'sandbox',
    baseUrl: 'https://api.sandbox.lulu.com',
    authBasic: SANDBOX_AUTH_BASIC
  };
}

export async function getLuluAccessToken(requestedEnv) {
  const cfg = getLuluConfig(requestedEnv);
  const tokenRes = await fetch(
    `${cfg.baseUrl}/auth/realms/glasstree/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: {
        Authorization: cfg.authBasic,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    }
  );

  if (!tokenRes.ok) {
    const errText = await tokenRes.text().catch(() => '');
    throw new Error(`Error autenticando con Lulu API [${cfg.env}] (${tokenRes.status}): ${errText.slice(0, 200)}`);
  }

  const tokenData = await tokenRes.json();
  return { accessToken: tokenData.access_token, cfg };
}

export async function luluApiRequest(path, { method = 'GET', body = null, env = undefined } = {}) {
  const { accessToken, cfg } = await getLuluAccessToken(env);
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Cache-Control': 'no-cache'
  };
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return { ok: res.ok, status: res.status, data, env: cfg.env };
}
