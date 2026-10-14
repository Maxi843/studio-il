// Cloudflare Worker: the website itself is served from static files (see wrangler.jsonc);
// this script only handles the editor's "Login with GitHub" at /api/auth and /api/callback.
// Needs GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the Worker's Variables and Secrets.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/auth') return auth(url, env);
    if (url.pathname === '/api/callback') return callback(request, url, env);
    return env.ASSETS.fetch(request);
  }
};

// step 1: send the editor to GitHub to sign in
function auth(url, env) {
  const state = crypto.randomUUID();
  const github = new URL('https://github.com/login/oauth/authorize');
  github.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  github.searchParams.set('redirect_uri', `${url.origin}/api/callback`);
  github.searchParams.set('scope', 'repo,user');
  github.searchParams.set('state', state);
  return new Response(null, {
    status: 302,
    headers: {
      Location: github.toString(),
      'Set-Cookie': `il_oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
    }
  });
}

// step 2: GitHub sends the editor back here; swap the one-time code for a token
// and hand it to the dashboard window that opened the login
async function callback(request, url, env) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookie = (request.headers.get('Cookie') || '').match(/il_oauth_state=([^;]+)/);

  let message;
  if (!code || !state || !cookie || cookie[1] !== state) {
    message = 'authorization:github:error:' + JSON.stringify({ message: 'Login expired, please try again.' });
  } else {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'studio-il-editor' },
      body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code })
    });
    const data = await res.json().catch(() => ({}));
    message = data.access_token
      ? 'authorization:github:success:' + JSON.stringify({ token: data.access_token, provider: 'github' })
      : 'authorization:github:error:' + JSON.stringify({ message: data.error_description || 'GitHub login failed.' });
  }

  // the token is only ever posted to this site's own /admin/ window
  const html = `<!doctype html><meta charset="utf-8"><title>Signing in</title><p>Signing in…</p>
<script>
  (function () {
    var origin = ${JSON.stringify(url.origin)};
    var message = ${JSON.stringify(message)};
    window.addEventListener('message', function (e) {
      if (e.origin !== origin) return;
      window.opener.postMessage(message, origin);
      setTimeout(function () { window.close(); }, 200);
    });
    window.opener && window.opener.postMessage('authorizing:github', origin);
  })();
</script>`;
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': 'il_oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
    }
  });
}
