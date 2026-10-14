# E-mails de connexion (Supabase Auth)

Modèles HTML envoyés par Supabase (via Brevo) : code d'inscription, mot de passe oublié, changement d'e-mail,
code de vérification, lien de connexion, invitation. Les objets sont dans `subjects.json`.

- Source : `build.py` génère les modèles (charte Sprintys, logo servi par GitHub Pages `docs/email/logo.png`).
- Ils sont appliqués au projet via l'API de gestion Supabase (`PATCH /v1/projects/<ref>/config/auth`)
  ou à la main : Supabase → Authentication → Emails → Templates (coller le HTML du fichier correspondant).
- `{{ .Token }}` = code à 6 chiffres ; `{{ .ConfirmationURL }}` = lien ; le code est aussi dans le texte
  d'aperçu caché pour que Gmail / iOS proposent « Copier le code ».
