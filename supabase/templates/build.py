import json
BLUE='#0069E8'
def page(title, intro, body, outro, preheader=''):
    LOGO='https://kleveensv-sprinflow.github.io/sprintys-app/email/logo.png'
    pre = f'<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">{preheader}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>' if preheader else ''
    return f"""<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>{title}</title></head>
<body style="margin:0;padding:0;background:#EEF3FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;">
{pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF3FB;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:20px;overflow:hidden;">
<tr><td style="height:5px;background:linear-gradient(90deg,#0069E8,#00B4D8);background-color:{BLUE};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:24px 28px 0;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;"><img src="{LOGO}" width="40" height="40" alt="Sprintys" style="display:block;border:0;border-radius:10px;"></td>
<td style="vertical-align:middle;padding-left:10px;font-size:20px;font-weight:800;letter-spacing:-0.3px;color:#0F172A;">Sprintys</td>
</tr></table></td></tr>
<tr><td style="padding:22px 28px 28px;">
<h1 style="margin:0 0 10px;font-size:22px;line-height:1.3;font-weight:800;color:#0F172A;">{title}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#334155;">{intro}</p>
{body}
<p style="margin:22px 0 0;font-size:13px;line-height:1.5;color:#64748B;">{outro}</p>
</td></tr>
<tr><td style="padding:18px 28px;background:#F8FAFC;font-size:12px;line-height:1.5;color:#94A3B8;">
Une question ? Écris-nous à <a href="mailto:sprinty.flow@gmail.com" style="color:{BLUE};text-decoration:none;">sprinty.flow@gmail.com</a>.<br>Sprintys, l'app d'entraînement des athlètes et de leurs coachs.
</td></tr></table></td></tr></table></body></html>"""
def code(tok='{{ .Token }}'):
    return (f'<div style="text-align:center;margin:8px 0 6px;"><span style="display:inline-block;padding:14px 26px;border-radius:14px;background:#EEF5FF;font-size:32px;font-weight:800;letter-spacing:8px;color:{BLUE};font-family:Menlo,Consolas,monospace;-webkit-user-select:all;user-select:all;">{tok}</span></div>'
            '<p style="margin:6px 0 0;font-size:12px;color:#94A3B8;text-align:center;">Appuie longuement sur le code pour le copier.</p>')
def button(label, href='{{ .ConfirmationURL }}'):
    return f'<div style="text-align:center;margin:18px 0 4px;"><a href="{href}" style="display:inline-block;padding:13px 26px;border-radius:999px;background:{BLUE};color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;">{label}</a></div>'
cfg={
 'smtp_sender_name':'Sprintys',
 'mailer_subjects_confirmation':'Ton code de confirmation Sprintys',
 'mailer_templates_confirmation_content':page('Bienvenue sur Sprintys','Voici ton code pour activer ton compte. Saisis-le dans l\'application :',code(),'Ce code expire dans 1 heure. Si tu n\'as pas créé de compte, ignore simplement cet e-mail.','Ton code Sprintys : {{ .Token }}'),
 'mailer_subjects_recovery':'Réinitialise ton mot de passe Sprintys',
 'mailer_templates_recovery_content':page('Nouveau mot de passe','Tu as demandé à changer ton mot de passe. Saisis ce code dans l\'application :',code()+'<p style="margin:16px 0 0;font-size:13px;color:#64748B;text-align:center;">Ou, depuis ton téléphone :</p>'+button('Changer mon mot de passe'),'Ce code expire dans 1 heure. Si tu n\'as rien demandé, ignore cet e-mail : ton mot de passe actuel ne change pas.','Ton code de réinitialisation : {{ .Token }}'),
 'mailer_subjects_email_change':'Confirme ta nouvelle adresse e-mail',
 'mailer_templates_email_change_content':page('Confirme ta nouvelle adresse','Tu as demandé à remplacer {{ .Email }} par {{ .NewEmail }} sur ton compte Sprintys. Touche le bouton pour confirmer :',button('Confirmer ma nouvelle adresse'),'Si tu n\'es pas à l\'origine de cette demande, ignore cet e-mail et change ton mot de passe.'),
 'mailer_subjects_reauthentication':'Ton code de vérification Sprintys',
 'mailer_templates_reauthentication_content':page('Code de vérification','Pour confirmer cette action sur ton compte, saisis ce code dans l\'application :',code(),'Si tu n\'es pas à l\'origine de cette demande, ignore cet e-mail.','Ton code de vérification : {{ .Token }}'),
 'mailer_subjects_magic_link':'Ta connexion à Sprintys',
 'mailer_templates_magic_link_content':page('Connexion à Sprintys','Touche le bouton pour te connecter, ou saisis ce code dans l\'application :',code()+button('Me connecter'),'Ce lien expire dans 1 heure. Si tu n\'as rien demandé, ignore cet e-mail.','Ton code de connexion : {{ .Token }}'),
 'mailer_subjects_invite':'Tu es invité sur Sprintys',
 'mailer_templates_invite_content':page('Rejoins Sprintys','Tu as été invité à rejoindre Sprintys. Touche le bouton pour créer ton compte :',button('Créer mon compte'),'Si tu ne connais pas l\'expéditeur de cette invitation, ignore cet e-mail.'),
}
json.dump(cfg,open('cfg.json','w'))
open('preview2.html','w').write(cfg['mailer_templates_confirmation_content'].replace('{{ .Token }}','482913'))
open('preview.html','w').write(cfg['mailer_templates_recovery_content'].replace('{{ .Token }}','482913'))
print('ok')
