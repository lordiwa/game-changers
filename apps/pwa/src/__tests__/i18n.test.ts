import { describe, it, expect } from 'vitest';
import es from '../locales/es.json';

describe('i18n locales', () => {
  it('Spanish consent.cta.accept resolves to "Acepto y continúo"', () => {
    expect(es.consent.cta.accept).toBe('Acepto y continúo');
  });
  it('Spanish app.brand resolves to "GameChangers"', () => {
    expect(es.app.brand).toBe('GameChangers');
  });
});
