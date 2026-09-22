import { useEffect, useState } from 'react';
import { subscribeToNewOrders } from '../../lib/realtime';

interface Props {
  initial: number;
  /** When provided, re-fetches authoritative count from this URL on every UPDATE event. */
  countUrl?: string;
}

export default function NewOrdersBadge({ initial, countUrl }: Props) {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    return subscribeToNewOrders(async (_evt, kind) => {
      if (kind === 'insert') {
        setCount((c) => c + 1);
      } else if (kind === 'update' && countUrl) {
        try {
          const res = await fetch(countUrl);
          if (res.ok) {
            const { count: live } = (await res.json()) as { count: number };
            setCount(live);
          }
        } catch {
          // network error — leave count as-is
        }
      }
    });
  }, [countUrl]);
  if (count === 0) return null;
  return (
    <span className="ml-1.5 inline-flex items-center rounded-full bg-[#F5EDD8] px-1.5 py-0.5 text-[10px] font-semibold text-[#1A1A1A]">
      {count}
    </span>
  );
}
