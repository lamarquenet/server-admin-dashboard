/**
 * Format a cost as USD, always in dollars (never cents).
 * Uses as many decimals as needed, capped at 5 (0.00001 precision);
 * smaller values round at that precision. Keeps a minimum of 2 decimals.
 */
const formatCurrency = (value) => {
  if (value === null || value === undefined) return 'N/A';
  const fixed = Number(value).toFixed(5);
  // Drop trailing zeros but never below 2 decimals: $1.50000 -> $1.50
  const trimmed = fixed.replace(/(\.\d\d\d*?)0+$/, '$1');
  return `$${trimmed}`;
};

export default formatCurrency;
