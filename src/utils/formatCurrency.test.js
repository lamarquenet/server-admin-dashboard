import formatCurrency from './formatCurrency';

describe('formatCurrency — siempre USD, hasta 5 decimales', () => {
  it('muestra 2 decimales como mínimo (convención monetaria)', () => {
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(2)).toBe('$2.00');
    expect(formatCurrency(0.1)).toBe('$0.10');
  });

  it('usa solo los decimales necesarios, sin ceros de relleno', () => {
    expect(formatCurrency(0.005)).toBe('$0.005');
    expect(formatCurrency(1.5)).toBe('$1.50');
    expect(formatCurrency(0.0001)).toBe('$0.0001');
  });

  it('llega hasta 5 decimales (precisión 0.00001)', () => {
    expect(formatCurrency(0.000183)).toBe('$0.00018');
    expect(formatCurrency(12.3456789)).toBe('$12.34568');
  });

  it('redondea valores más chicos que la precisión de 5 decimales', () => {
    expect(formatCurrency(0.000006)).toBe('$0.00001');
    // por debajo de la precisión, el redondeo + trim de ceros deja el mínimo de 2 decimales
    expect(formatCurrency(0.000004)).toBe('$0.00');
    expect(formatCurrency(0.0000016)).toBe('$0.00');
  });

  it('devuelve N/A para valores ausentes', () => {
    expect(formatCurrency(null)).toBe('N/A');
    expect(formatCurrency(undefined)).toBe('N/A');
  });
});
