'use client';
import { createClient } from '../utils/supabase/client';
import type { Suggestion } from './types';

const supabase = createClient();

interface SuggestionJoinRow {
  id: string;
  content: string;
  created_at: string;
  author_member_id: string;
  author: { display_name: string } | { display_name: string }[] | null;
}

function rowToSuggestion(row: SuggestionJoinRow): Suggestion {
  const author = Array.isArray(row.author) ? row.author[0] : row.author;
  return {
    id: row.id,
    owner: author?.display_name ?? '알 수 없음',
    content: row.content,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function fetchGuildSuggestions(guildId: string): Promise<Suggestion[]> {
  const { data, error } = await supabase
    .from('suggestions')
    .select('id, content, created_at, author_member_id, author:guild_members(display_name)')
    .eq('guild_id', guildId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as SuggestionJoinRow[]).map(rowToSuggestion);
}

export async function addSuggestionToGuild(
  guildId: string,
  memberId: string,
  content: string
): Promise<Suggestion[]> {
  const { error } = await supabase
    .from('suggestions')
    .insert({ guild_id: guildId, author_member_id: memberId, content });
  if (error) throw error;
  return fetchGuildSuggestions(guildId);
}

export async function updateSuggestionRow(guildId: string, id: string, content: string): Promise<Suggestion[]> {
  const { error } = await supabase.from('suggestions').update({ content }).eq('id', id);
  if (error) throw error;
  return fetchGuildSuggestions(guildId);
}

export async function deleteSuggestionRow(guildId: string, id: string): Promise<Suggestion[]> {
  const { error } = await supabase.from('suggestions').delete().eq('id', id);
  if (error) throw error;
  return fetchGuildSuggestions(guildId);
}
