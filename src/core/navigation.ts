import type { Router } from 'expo-router';

/**
 * Back button that always leads somewhere sensible: the previous screen when there is one, otherwise (deep link,
 * notification, page reload) the given home screen instead of doing nothing.
 */
export function goBack(router: Router, fallback: string = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as any);
}
