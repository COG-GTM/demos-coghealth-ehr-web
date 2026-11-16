export interface BannerAllergy {
  allergen: string;
  severity: string;
}

export interface AllergySummary {
  hasSevere: boolean;
  heading: string;
  items: { allergen: string; severe: boolean; label: string }[];
}

export const isSevereAllergy = (severity: string | null | undefined) =>
  (severity ?? '').trim().toLowerCase() === 'severe';

export function summarizeAllergies(allergies: BannerAllergy[]): AllergySummary {
  const items = allergies
    .map(a => {
      const severe = isSevereAllergy(a.severity);
      return { allergen: a.allergen, severe, label: severe ? `${a.allergen} (SEVERE)` : a.allergen };
    })
    .sort((a, b) => Number(b.severe) - Number(a.severe));
  const hasSevere = items.some(i => i.severe);
  return { hasSevere, heading: hasSevere ? 'SEVERE ALLERGIES:' : 'ALLERGIES:', items };
}
