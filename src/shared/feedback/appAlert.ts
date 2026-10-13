import { useSprintyStore, SprintyStatus } from '../../store/sprintyStore';
import { useFeedbackStore, DialogButton } from './feedbackStore';

/**
 * Drop-in replacement for Alert.alert with the app's own visuals:
 * - plain information (no choice to make) becomes a toast, so nothing blocks the user;
 * - real choices open the glass confirmation sheet.
 * Same signature as Alert.alert so call sites stay readable.
 */

const ACK_LABELS = /^(ok|d['’]accord|compris|fermer|parfait|super|génial|merci)\b/i;

const stripEmoji = (s: string) =>
  s
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const inferStatus = (title: string, message = ''): SprintyStatus => {
  const t = `${title} ${message}`;
  if (/erreur|impossible|échec|echec|oups|invalide|introuvable|refusé|n['’]a pas pu|pas pu/i.test(t)) return 'error';
  if (/attention|requis|manquant|incomplet|veuillez|limite|déjà|choisis|sélectionne|indique|renseigne|ajoute au moins|saisis/i.test(title))
    return 'warning';
  if (/succès|bravo|enregistr|ajouté|supprimé|envoyé|copié|terminé|mis à jour|créé|validé|c['’]est fait|✅|🎉/i.test(t)) return 'success';
  return 'info';
};

export function toast(status: SprintyStatus, message: string, title?: string) {
  const length = (title?.length ?? 0) + message.length;
  const duration = Math.min(6500, Math.max(2600, 1800 + length * 45));
  useSprintyStore.getState().showFeedback(status, message, duration, title);
}

export function appAlert(title: string, message?: string, buttons?: DialogButton[], options?: { cancelable?: boolean }) {
  const list = (buttons ?? []).filter(Boolean);
  const cleanTitle = stripEmoji(title || '');
  const cleanMessage = message ? stripEmoji(message) : undefined;

  const isAck = list.length === 0 || (list.length === 1 && (!list[0].text || ACK_LABELS.test(list[0].text.trim())));
  if (isAck) {
    const status = inferStatus(cleanTitle, cleanMessage);
    if (cleanMessage) toast(status, cleanMessage, cleanTitle || undefined);
    else toast(status, cleanTitle);
    list[0]?.onPress?.();
    return;
  }

  useFeedbackStore.getState().showDialog({
    title: cleanTitle,
    message: cleanMessage,
    buttons: list.map((b) => ({ ...b, text: b.text ? stripEmoji(b.text) : 'OK' })),
    cancelable: options?.cancelable ?? true,
  });
}

/** Promise-based confirmation sheet: resolves true when the main action is chosen. */
export function confirmAsync({
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  destructive = false,
  icon,
}: {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  icon?: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    useFeedbackStore.getState().showDialog({
      title,
      message,
      icon,
      cancelable: true,
      buttons: [
        { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
    });
  });
}
