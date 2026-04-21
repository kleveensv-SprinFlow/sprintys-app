export interface BodyMetric {
  id: string;
  date: Date;
  weight: number; // in kg or lbs
  bodyFatPercentage?: number; // optional, e.g., 15.5
  notes?: string;
}
