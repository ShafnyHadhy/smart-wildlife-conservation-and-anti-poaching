import { useCallback, useEffect, useRef, useState } from 'react';
import { ConflictReport } from '../types';
import { mobileConflictService } from '../services/conflictService';

interface Options {
  /** Limit to one community member's reports. Omit for the ranger queue. */
  communityMemberId?: string;
  /** Auto-refresh interval so status changes appear without manual refresh. */
  pollMs?: number;
}

interface PendingOp {
  clientMutationId: string;
  payload: any;
  createdAt?: string;
}

export function useConflictReports({ communityMemberId, pollMs = 15000 }: Options = {}) {
  const [reports, setReports] = useState<ConflictReport[]>([]);
  const [pending, setPending] = useState<PendingOp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [remote, pendingOps] = await Promise.all([
          mobileConflictService.getConflictReports(communityMemberId),
          mobileConflictService.getPendingOfflineConflicts().catch(() => []),
        ]);
        if (!mounted.current) return;
        setReports(remote);
        setPending(pendingOps as PendingOp[]);
        setError(null);
        setLastUpdated(Date.now());
      } catch (err: any) {
        if (!mounted.current) return;
        const pendingOps = await mobileConflictService.getPendingOfflineConflicts().catch(() => []);
        if (mounted.current) setPending(pendingOps as PendingOp[]);
        // Keep the last good data on screen; only surface the error.
        setError(err?.message || 'Could not reach the server.');
      } finally {
        if (mounted.current && !silent) setLoading(false);
      }
    },
    [communityMemberId]
  );

  useEffect(() => {
    mounted.current = true;
    refresh();
    let timer: ReturnType<typeof setInterval> | undefined;
    if (pollMs > 0) {
      timer = setInterval(() => refresh(true), pollMs);
    }
    return () => {
      mounted.current = false;
      if (timer) clearInterval(timer);
    };
  }, [refresh, pollMs]);

  /** Swap a single updated report into the list immediately (optimistic UI). */
  const replaceReport = useCallback((updated: ConflictReport) => {
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  return { reports, pending, loading, error, lastUpdated, refresh, replaceReport };
}
