'use client';
import { createContext, useContext } from 'react';
import type { GuildRole } from './dbTypes';

export interface GuildMemberInfo {
  id: string;
  user_id: string;
  display_name: string;
  role: GuildRole;
}

export interface GuildContextValue {
  guildId: string;
  guildName: string;
  myUserId: string;
  myMemberId: string;
  myRole: GuildRole;
  members: GuildMemberInfo[];
}

export const GuildContext = createContext<GuildContextValue | null>(null);

export function useGuild(): GuildContextValue {
  const ctx = useContext(GuildContext);
  if (!ctx) throw new Error('useGuild must be used within a GuildContext.Provider');
  return ctx;
}
