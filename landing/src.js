// APIViz — landing page. Redirige www vers le domaine nu, puis sert les fichiers de public/.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "www.apiviz.fr") {
      url.hostname = "apiviz.fr";
      return Response.redirect(url.toString(), 301);
    }
    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    out.headers.set("X-Content-Type-Options", "nosniff");
    out.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return out;
  }
};
