# E-mails de connexion (Supabase Auth)

Modèles en français des e-mails envoyés par Supabase Auth, au même format que les e-mails d'Apiviz
(`supabase/functions/courriels/courriel.js`) : tutoiement, aucun contenu de l'exploitation, un bouton et le lien en clair.

| Fichier | Écran Supabase (Authentication › Emails › Templates) | Objet |
|---|---|---|
| `confirm-sign-up.html` | Confirm sign up | voir `sujets.json` |
| `reset-password.html` | Reset password | |
| `magic-link-or-otp.html` | Magic link or OTP | |
| `change-email-address.html` | Change email address | |

Appliqués sur **Apiviz-test** le 27 nov. 2026 (objet et source HTML copiés dans Authentication › Emails › Templates). **Apiviz (production) : pas encore**, après vérification en recette. Envoi par le
SMTP de Brevo (`no-reply@apiviz.fr`, voir `docs/TECHNIQUE.md` § E-mails). Toute modification : changer le fichier ici,
puis le recopier dans les deux projets.
