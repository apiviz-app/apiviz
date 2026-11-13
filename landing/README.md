# Landing page apiviz.fr

Page d'accueil publique d'apiviz, servie par le Worker Cloudflare `apiviz-landing` sur `apiviz.fr` (et `www.apiviz.fr`, redirigé vers `apiviz.fr`).

- `public/index.html` : la page, en un seul fichier (styles, scripts, logo apiviz inclus).
- `src.js` : redirection `www` → domaine nu, puis fichiers de `public/`.
- `wrangler.jsonc` : Worker et domaines.

Publier : `cd landing && npx wrangler@4 deploy`.
Boutons « Créer mon compte » et « Se connecter » : `https://app.apiviz.fr/` (constante `APP_URL` en bas de `public/index.html`).
`public/api-compagnon.js` est une copie de `api-compagnon.js` (racine du dépôt) : la recopier quand API change.
Photos : Unsplash (licence Unsplash, usage commercial libre), en WebP dans `public/img/`.
