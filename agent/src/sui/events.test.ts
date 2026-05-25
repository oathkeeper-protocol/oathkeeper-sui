import { describe, it, expect } from 'vitest';
import { qualifyEventType, EventTypes } from './events.js';

describe('qualifyEventType', () => {
  it('prefixes the package id to the module::event path', () => {
    expect(qualifyEventType('0xABC', 'OathMinted')).toBe('0xABC::oath::OathMinted');
    expect(qualifyEventType('0xABC', 'StakePlaced')).toBe('0xABC::doubter::StakePlaced');
    expect(qualifyEventType('0xABC', 'TradeAttested')).toBe(
      '0xABC::attestation::TradeAttested',
    );
    expect(qualifyEventType('0xABC', 'LPDeposit')).toBe('0xABC::economics::LPDeposit');
  });

  it('covers every declared event type without duplication', () => {
    const values = Object.values(EventTypes);
    expect(new Set(values).size).toBe(values.length);
    expect(values.length).toBeGreaterThanOrEqual(11);
  });
});
