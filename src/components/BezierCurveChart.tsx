import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';

export interface CurvePoint {
  label: string; // ex: "03/10" ou "Séance 1"
  value: number; // valeur numérique brute
  formattedValue?: string; // ex: "15.90s" ou "90kg"
}

interface BezierCurveChartProps {
  title?: string;
  points: CurvePoint[];
  metricType?: 'chrono' | 'weight' | 'score'; // 'chrono' : plus bas = meilleur
  unit?: string;
  height?: number;
}

export const BezierCurveChart: React.FC<BezierCurveChartProps> = ({
  title,
  points,
  metricType = 'chrono',
  unit = '',
  height = 140,
}) => {
  if (!points || points.length < 2) {
    return null;
  }

  const paddingLeft = 32;
  const paddingRight = 32;
  const paddingTop = 24;
  const paddingBottom = 28;
  const chartWidth = 310;
  const chartHeight = height;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const rawValues = points.map((p) => p.value);
  const minVal = Math.min(...rawValues);
  const maxVal = Math.max(...rawValues);
  const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  // Calcul des coordonnées (X, Y) pour chaque point
  const coords = points.map((p, idx) => {
    const x = paddingLeft + (idx / (points.length - 1)) * innerWidth;
    // Inversion Y : en SVG 0 est en haut
    const normalizedY = (p.value - minVal) / valRange;
    const y = paddingTop + (1 - normalizedY) * innerHeight;
    return { x, y, point: p };
  });

  // Calcul du tracé Bézier lissé (Catmull-Rom vers Cubic Bezier)
  let linePath = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = i > 0 ? coords[i - 1] : coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = i < coords.length - 2 ? coords[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  // Tracé fermé pour l'aire dégradée sous la montagne
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${chartHeight - paddingBottom} L ${coords[0].x} ${chartHeight - paddingBottom} Z`;

  // Déterminer la tendance globale
  const firstVal = rawValues[0];
  const lastVal = rawValues[rawValues.length - 1];
  const delta = lastVal - firstVal;

  // Pour un chrono, une baisse (delta < 0) est une progression (vert).
  // Pour une charge, une hausse (delta > 0) est une progression (vert).
  const isProgression =
    metricType === 'chrono' ? delta < 0 : delta > 0;

  const strokeColor = isProgression ? '#10B981' : '#F59E0B';
  const gradientStart = isProgression ? '#10B981' : '#F59E0B';

  return (
    <View style={styles.container}>
      {title && (
        <View style={styles.titleRow}>
          <Text style={styles.titleText}>{title}</Text>
          <View
            style={[
              styles.trendBadge,
              { backgroundColor: isProgression ? '#ECFDF5' : '#FFFBEB' },
            ]}
          >
            <Text
              style={[
                styles.trendText,
                { color: isProgression ? '#059669' : '#D97706' },
              ]}
            >
              {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
              {unit}
            </Text>
          </View>
        </View>
      )}

      <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        <Defs>
          <LinearGradient id="mountainGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={gradientStart} stopOpacity="0.45" />
            <Stop offset="80%" stopColor={gradientStart} stopOpacity="0.08" />
            <Stop offset="100%" stopColor={gradientStart} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Ligne de base horizontale */}
        <Line
          x1={paddingLeft - 8}
          y1={chartHeight - paddingBottom}
          x2={chartWidth - paddingRight + 8}
          y2={chartHeight - paddingBottom}
          stroke="#E2E8F0"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Relief montagne (aire dégradée) */}
        <Path d={areaPath} fill="url(#mountainGradient)" />

        {/* Courbe lissée principale */}
        <Path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points de données et étiquettes */}
        {coords.map((c, idx) => (
          <React.Fragment key={idx}>
            {/* Ligne verticale de repère */}
            <Line
              x1={c.x}
              y1={c.y}
              x2={c.x}
              y2={chartHeight - paddingBottom}
              stroke="#E2E8F0"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            {/* Halo point */}
            <Circle cx={c.x} cy={c.y} r="6" fill="#FFFFFF" />
            <Circle cx={c.x} cy={c.y} r="4" fill={strokeColor} />

            {/* Valeur au-dessus du point */}
            <Text
              key={`val-${idx}`}
              style={{
                position: 'absolute',
                left: c.x - 24,
                top: c.y - 18,
                width: 48,
                textAlign: 'center',
                fontSize: 10,
                fontWeight: '700',
                color: '#0F172A',
              }}
            >
              {c.point.formattedValue || `${c.point.value}${unit}`}
            </Text>
          </React.Fragment>
        ))}
      </Svg>

      {/* Axe horizontal X : dates / séances */}
      <View style={styles.labelsRow}>
        {points.map((p, idx) => (
          <Text key={idx} style={styles.xAxisLabel} numberOfLines={1}>
            {p.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 6,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '800',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 2,
  },
  xAxisLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
});
