// Serves site/ as static files. www.barbican.estate redirects to the bare domain.
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.hostname === 'www.barbican.estate') {
      url.hostname = 'barbican.estate';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(req);
  },
};
