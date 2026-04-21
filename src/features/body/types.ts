export interface BodyMetric {
  id: string;
  date: string;
  weight: number;
  bodyFat?: number;
  muscleMass?: number;
}

export interface BodyState {
  metrics: BodyMetric[];
}
