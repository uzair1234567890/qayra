import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mock factory so vi.mock can reach the rpc spy.
const rpcMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/lib/supabase/service', () => ({
  serviceClient: () => ({ rpc: rpcMock }),
}));

import { nextOrderCode } from '../../src/lib/order-code';

describe('nextOrderCode', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('returns the code string from the RPC', async () => {
    rpcMock.mockResolvedValue({ data: 'Q-0042', error: null });
    const code = await nextOrderCode();
    expect(code).toBe('Q-0042');
    expect(rpcMock).toHaveBeenCalledWith('next_order_code');
  });

  it('throws when the RPC returns an error', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });
    await expect(nextOrderCode()).rejects.toThrow(/rpc failed/);
  });

  it('throws when the RPC returns no data', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    await expect(nextOrderCode()).rejects.toThrow(/Failed to get order code/);
  });
});
