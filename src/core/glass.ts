import { Platform, ViewStyle } from 'react-native';
import { universalColors } from './theme';

/**
 * Light frosted-glass ("verre dépoli") theme building blocks.
 *
 * Cards are milky translucent white over the GlowBackground, with a lit top rim,
 * a shaded bottom rim and a soft top reflection (<GlassSheen />). No noise texture:
 * stretched over large cards it reads as stains, not frosting. There is no real blur on cards
 * on purpose: behind them there are only static, already soft glows, so a blur
 * would look the same and cost a lot on Android. Real blur is kept for bars that
 * content actually scrolls under (tab bars).
 *
 * No elevation on Android: it draws a grey halo through translucent views.
 * Modals and bottom sheets stay solid (theme.colors.surface): glass over a dark
 * overlay turns grey and hurts readability.
 */

const glassShadow: ViewStyle =
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#1E3A8A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.05,
      shadowRadius: 20,
    },
    android: { elevation: 0 },
    default: {},
  }) || {};

/** Fill + rim + shadow only: combine with the component's own radius / padding. */
export const glassSurface: ViewStyle = {
  backgroundColor: universalColors.glass,
  borderWidth: 1,
  borderColor: universalColors.glassBorder,
  borderTopColor: universalColors.glassRimTop,
  borderBottomColor: universalColors.glassRimBottom,
  ...glassShadow,
};

/** Rim colors to re-apply after overriding borderColor on a glass surface. */
export const glassRim: ViewStyle = {
  borderTopColor: universalColors.glassRimTop,
  borderBottomColor: universalColors.glassRimBottom,
};

/** Ready-made card: glass surface, continuous corners, 16 padding. */
export const glassCard: ViewStyle = {
  ...glassSurface,
  borderRadius: 22,
  borderCurve: 'continuous',
  padding: 16,
};

/** Translucent bar over the glows (headers). */
export const glassBar: ViewStyle = {
  backgroundColor: universalColors.glassBar,
  borderBottomWidth: 1,
  borderBottomColor: universalColors.hairline,
};

export const GLASS_BACKDROP = universalColors.backdrop;
export const glassFill = universalColors.glassFill;
