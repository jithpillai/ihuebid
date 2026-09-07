// Pure aggregation engine (requirements §8.2): resistant to isolated extreme
// values (median + percentile band, not a naive average), and honest about
// uncertainty (confidence is sample-size-driven for now — see the CLAUDE.md
// note on why suspicion-signal-driven downgrades aren't wired in yet).

export type ConfidenceLevel = "LOW" | "MEDIUM" | "HIGH";
export type ComparisonTier = "GREEN" | "YELLOW" | "RED" | "PURPLE";

export type DistributionBin = { rangeLow: number; rangeHigh: number; count: number };
export type Comparison = { tier: ComparisonTier; label: string };

export type AggregateResultData = {
  count: number;
  consensus: number | null;
  band: [number, number] | null;
  confidence: ConfidenceLevel;
  distribution: DistributionBin[];
  comparison: Comparison | null;
};

// Starting heuristics, not final — see CLAUDE.md.
const CONFIDENCE_MEDIUM_MIN_COUNT = 5;
const CONFIDENCE_HIGH_MIN_COUNT = 15;
const WIDE_DISPERSION_BAND_TO_CONSENSUS_RATIO = 0.35;
const GREEN_MAX_ABOVE_PERCENT = 0.05;
const YELLOW_MAX_ABOVE_PERCENT = 0.15;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const index = p * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function confidenceForCount(count: number): ConfidenceLevel {
  if (count >= CONFIDENCE_HIGH_MIN_COUNT) return "HIGH";
  if (count >= CONFIDENCE_MEDIUM_MIN_COUNT) return "MEDIUM";
  return "LOW";
}

function buildDistribution(values: number[], min: number, max: number, binCount: number): DistributionBin[] {
  const span = max - min;
  const binWidth = span > 0 ? span / binCount : 0;
  const bins: DistributionBin[] = Array.from({ length: binCount }, (_, i) => ({
    rangeLow: min + i * binWidth,
    rangeHigh: min + (i + 1) * binWidth,
    count: 0,
  }));
  if (binWidth <= 0) return bins;
  for (const value of values) {
    const index = Math.min(binCount - 1, Math.max(0, Math.floor((value - min) / binWidth)));
    bins[index].count += 1;
  }
  return bins;
}

function compareToExpectation(consensus: number, band: [number, number], expectedPrice: number): Comparison {
  const bandWidth = band[1] - band[0];
  if (consensus > 0 && bandWidth / consensus > WIDE_DISPERSION_BAND_TO_CONSENSUS_RATIO) {
    return { tier: "PURPLE", label: "Responses vary widely; this item has an uncertain or highly subjective value." };
  }

  const diffPercent = consensus > 0 ? (expectedPrice - consensus) / consensus : 0;
  if (diffPercent <= GREEN_MAX_ABOVE_PERCENT) {
    return { tier: "GREEN", label: "Expectation is well-supported by audience responses." };
  }
  if (diffPercent <= YELLOW_MAX_ABOVE_PERCENT) {
    return { tier: "YELLOW", label: "Expectation is plausible, but above the current consensus." };
  }
  return { tier: "RED", label: "Expectation is materially above the current market signal." };
}

export function computeAggregate(
  values: number[],
  options: { expectedPrice?: number; min: number; max: number; binCount?: number },
): AggregateResultData {
  const { expectedPrice, min, max, binCount = 8 } = options;
  const distribution = buildDistribution(values, min, max, binCount);

  if (values.length === 0) {
    return { count: 0, consensus: null, band: null, confidence: "LOW", distribution, comparison: null };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const consensus = percentile(sorted, 0.5);
  const band: [number, number] = [percentile(sorted, 0.25), percentile(sorted, 0.75)];
  const confidence = confidenceForCount(values.length);
  const comparison = expectedPrice !== undefined ? compareToExpectation(consensus, band, expectedPrice) : null;

  return { count: values.length, consensus, band, confidence, distribution, comparison };
}
