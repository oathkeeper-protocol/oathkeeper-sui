import { describe, it, expect } from 'vitest';
import { qualifyEventType, EventTypes } from './events.js';

describe('qualifyEventType', () => {
  it('prefixes the package id to the module::event path', () => {
    expect(qualifyEventType('0xABC', 'OathMinted')).toBe('0xABC::oath::OathMinted');
    expect(qualifyEventType('0xABC', 'BelieverStaked')).toBe('0xABC::believer::BelieverStaked');
    expect(qualifyEventType('0xABC', 'DoubterStaked')).toBe('0xABC::doubter::DoubterStaked');
    expect(qualifyEventType('0xABC', 'TradeAttested')).toBe('0xABC::attestation::TradeAttested');
  });

  it('covers all v2 event types without duplication', () => {
    const values = Object.values(EventTypes);
    expect(new Set(values).size).toBe(values.length);
    expect(values.length).toBe(9);
  });
});
