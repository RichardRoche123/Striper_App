export function getTemperatureBucket(fahrenheit: number): string {
  if (fahrenheit < 40) return '<40';
  if (fahrenheit < 50) return '40-49';
  if (fahrenheit < 60) return '50-59';
  if (fahrenheit < 70) return '60-69';
  if (fahrenheit < 80) return '70-79';
  return '80+';
}
