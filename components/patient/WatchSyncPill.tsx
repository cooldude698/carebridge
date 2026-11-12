'use client';

import React from 'react';
import Link from 'next/link';
import { Watch, RefreshCw, WifiOff } from 'lucide-react';

export interface WatchSyncPillProps {
  provider?: string;
  lastSyncedAt?: string | null;
  status?: 'connected' | 'syncing' | 'offline';
  href?: string;
  className?: string;
}

function formatSyncTime(iso?: string | null): string {
  if (!iso) return 'Just now';
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return iso;
  const diffMins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (diffMins < 1) return 'Synced just now';
  if (diffMins < 60) return `Synced ${diffMins} min ago`;
  const hrs = Math.round(diffMins / 60);
  return `Synced ${hrs} hr${hrs > 1 ? 's' : ''} ago`;
}

export function WatchSyncPill({
  provider = 'Google Fit Bridge',
  lastSyncedAt,
  status = 'connected',
  href = '/patient/watch',
  className = '',
}: WatchSyncPillProps) {
  const pillContent = (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        status === 'offline'
          ? 'bg-[#F1F5F9] border-[#E2E8F0] text-[#475569]'
          : 'bg-[#F0FDFA] border-[#CCFBF1] text-[#0F766E] hover:bg-[#CCFBF1]/50'
      } ${className}`}
    >
      {status === 'syncing' ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : status === 'offline' ? (
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#14B8A6] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0D9488]" />
        </span>
      )}
      <Watch className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">
        {provider} · {status === 'syncing' ? 'Syncing...' : formatSyncTime(lastSyncedAt)}
      </span>
    </span>
  );

  if (href) {
    return <Link href={href}>{pillContent}</Link>;
  }
  return pillContent;
}

