import { describe, it, expect } from 'vitest';
import { fillsFromOrderFilled, type OrderFilledEvent } from './venue.js';

const BM = '0xbm_operator';
const OTHER = '0xbm_someone_else';

function ev(txDigest: string, taker: string, maker: string, quote: string): { txDigest: string; parsedJson: OrderFilledEvent } {
  return {
    txDigest,
    parsedJson: {
      base_quantity: '100',
      quote_quantity: quote,
      price: '1000',
      maker_balance_manager_id: maker,
      taker_balance_manager_id: taker,
      timestamp: '1700000000000',
    },
  };
}

describe('fillsFromOrderFilled', () => {
  it('extracts fills where the operator is the taker', () => {
    const fills = fillsFromOrderFilled([ev('0xa', BM, OTHER, '5000')], BM, 'BTC');
    expect(fills).toHaveLength(1);
    expect(fills[0]!.venueTxHash).toBe('0xa');
    expect(fills[0]!.notional).toBe(5000n);
    expect(fills[0]!.asset).toBe('BTC');
  });

  it('extracts fills where the operator is the maker', () => {
    const fills = fillsFromOrderFilled([ev('0xb', OTHER, BM, '2500')], BM, 'ETH');
    expect(fills).toHaveLength(1);
    expect(fills[0]!.notional).toBe(2500n);
  });

  it("ignores fills the operator's BalanceManager was not party to", () => {
    const fills = fillsFromOrderFilled([ev('0xc', OTHER, OTHER, '9000')], BM, 'BTC');
    expect(fills).toHaveLength(0);
  });

  it('maps quote_quantity to notional and the tx digest to venueTxHash (the attestable reference)', () => {
    const events = [ev('0xa', BM, OTHER, '1000'), ev('0xd', OTHER, OTHER, '7'), ev('0xe', OTHER, BM, '3000')];
    const fills = fillsFromOrderFilled(events, BM, '');
    expect(fills.map((f) => f.venueTxHash)).toEqual(['0xa', '0xe']);
    expect(fills.map((f) => f.notional)).toEqual([1000n, 3000n]);
  });
});
