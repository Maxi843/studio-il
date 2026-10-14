// Editor login, step 1 (Cloudflare Pages Function): send the editor to GitHub to sign in.
// Needs GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET set in the Cloudflare project settings.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
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
