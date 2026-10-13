import * as WebBrowser from 'expo-web-browser';
import { theme } from '../core/theme';

/** Public pages (GitHub Pages, from the docs/ folder of the repository). */
export const LEGAL_BASE_URL = 'https://kleveensv-sprinflow.github.io/sprintys-app';

export const LEGAL_LINKS = {
  privacy: `${LEGAL_BASE_URL}/confidentialite.html`,
  terms: `${LEGAL_BASE_URL}/cgu.html`,
  notice: `${LEGAL_BASE_URL}/mentions-legales.html`,
  deleteAccount: `${LEGAL_BASE_URL}/suppression-compte.html`,
};

/** Opens a page in the in-app browser, tinted like the app. */
export const openLegalPage = (url: string) =>
  WebBrowser.openBrowserAsync(url, {
    controlsColor: theme.colors.sprintyBlue,
    toolbarColor: '#FFFFFF',
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  }).catch(() => undefined);
