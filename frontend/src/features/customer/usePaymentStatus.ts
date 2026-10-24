import { useEffect, useRef, useState } from 'react';

export type PaymentPhase =
  | 'idle' | 'waiting' | 'succeeded' | 'failed' | 'unknown' | 'expired' | 'error';

interface Options {
  enabled: boolean;
  fetchStatus: (signal: AbortSignal) => Promise<{ status: string }>;
  expiresAt?: string;
  intervalMs?: number;
}

const MAX_CONSECUTIVE_FAILURES = 5;

function classify(status: string): PaymentPhase {
  switch (status) {
    case 'SUCCEEDED': return 'succeeded';
    case 'FAILED': return 'failed';
    case 'UNKNOWN': return 'unknown';
    default: return 'waiting';
  }
}

export function usePaymentStatus({ enabled, fetchStatus, expiresAt, intervalMs = 4000 }: Options) {
  const [phase, setPhase] = useState<PaymentPhase>('idle');
  const [rawStatus, setRawStatus] = useState<string | null>(null);
  const [lastError, setLastError] = useState<unknown>(null);
  const fetchRef = useRef(fetchStatus);
  fetchRef.current = fetchStatus;

  useEffect(() => {
    if (!enabled) { setPhase('idle'); return; }

    const controller = new AbortController();
    const expiryMs = expiresAt ? Date.parse(expiresAt) : NaN;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    let cancelled = false;

    setPhase('waiting');

    const tick = async () => {
      if (cancelled) return;
      const pastExpiry = !Number.isNaN(expiryMs) && Date.now() >= expiryMs;
      try {
        const { status } = await fetchRef.current(controller.signal);
        if (cancelled) return;
        failures = 0;
        setLastError(null);
        setRawStatus(status);
        const next = classify(status);
        if (next === 'waiting' && pastExpiry) { setPhase('expired'); return; }
        setPhase(next);
        if (next !== 'waiting') return;
      } catch (e) {
        if (cancelled || controller.signal.aborted) return;
        failures += 1;
        setLastError(e);
        if (failures >= MAX_CONSECUTIVE_FAILURES) { setPhase('error'); return; }
      }
      timer = setTimeout(tick, intervalMs);
    };

    void tick();
    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [enabled, expiresAt, intervalMs]);

  return { phase, rawStatus, lastError };
}
