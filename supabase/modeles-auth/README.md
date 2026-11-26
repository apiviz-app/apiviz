# E-mails de connexion (Supabase Auth)

Modèles en français des e-mails envoyés par Supabase Auth, au même format que les e-mails d'Apiviz
(`supabase/functions/courriels/courriel.js`) : tutoiement, aucun contenu de l'exploitation, un bouton et le lien en clair.

| Fichier | Écran Supabase (Authentication › Emails › Templates) | Objet |
|---|---|---|
| `confirm-sign-up.html` | Confirm sign up | voir `sujets.json` |
| `reset-password.html` | Reset password | |
| `magic-link-or-otp.html` | Magic link or OTP | |
| `change-email-address.html` | Change email address | |

Appliqués sur **Apiviz-test** le 27 nov. 2026 (objet et source HTML copiés dans Authentication › Emails › Templates). **Apiviz (production) : le 27 nov. 2026 à 0 h 15**, après un essai réussi en recette (objet français reçu à 0 h 09 ; Supabase met une dizaine de minutes à prendre un modèle en compte). Envoi par le
SMTP de Brevo (`no-reply@apiviz.fr`, voir `docs/TECHNIQUE.md` § E-mails). Toute modification : changer le fichier ici,
puis le recopier dans les deux projets.
