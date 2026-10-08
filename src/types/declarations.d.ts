/* eslint-disable */
declare module 'react-native-svg' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export interface SvgProps extends ViewProps {
    width?: number | string;
    height?: number | string;
    viewBox?: string;
    fill?: string;
    stroke?: string;
    children?: any;
    [key: string]: any;
  }

  export const Svg: ComponentType<SvgProps>;
  export default Svg;
  export const Circle: ComponentType<any>;
  export const Ellipse: ComponentType<any>;
  export const G: ComponentType<any>;
  export const Text: ComponentType<any>;
  export const TSpan: ComponentType<any>;
  export const TextPath: ComponentType<any>;
  export const Path: ComponentType<any>;
  export const Polygon: ComponentType<any>;
  export const Polyline: ComponentType<any>;
  export const Line: ComponentType<any>;
  export const Rect: ComponentType<any>;
  export const Use: ComponentType<any>;
  export const Image: ComponentType<any>;
  export const Symbol: ComponentType<any>;
  export const Defs: ComponentType<any>;
  export const LinearGradient: ComponentType<any>;
  export const RadialGradient: ComponentType<any>;
  export const Stop: ComponentType<any>;
  export const ClipPath: ComponentType<any>;
  export const Pattern: ComponentType<any>;
  export const Mask: ComponentType<any>;
}

declare module 'react-native-reanimated';
