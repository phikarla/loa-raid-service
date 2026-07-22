'use client';
import { create } from 'zustand';
import type {
  Character,
  RaidFormations,
  RaidFormation,
  Party,
  Team,
  PartyMember,
  Suggestion,
  AppSnapshot,
} from '../lib/types';
import { RAID_ORDER, is8PlayerRaid, findDuplicates } from '../lib/raidConfig';

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyFormations(): RaidFormations {
  const formations: RaidFormations = {};
  RAID_ORDER.forEach((raidName) => {
    if (is8PlayerRaid(raidName)) {
      formations[raidName] = { type: '8인', teams: [], standby: [] };
    } else {
      formations[raidName] = { type: '4인', parties: [], standby: [] };
    }
  });
  return formations;
}

function toPartyMember(c: Character): PartyMember {
  return {
    id: c.id,
    name: c.name,
    class: c.class,
    level: c.level,
    role: c.role,
    synergy: c.synergy,
    owner: c.owner,
  };
}

interface RaidState {
  // ── 상태 ──
  characterPool: Character[];
  raidFormations: RaidFormations;
  onlineMembers: string[];
  activeDispatches: string[];
  boardingFilters: string[];
  targetMemberFilter: string | null;
  isEditMode: boolean;
  suggestions: Suggestion[];
  history: AppSnapshot[];

  // ── 캐릭터 풀 ──
  setCharacterPool: (pool: Character[]) => void;
  addCharacters: (chars: Character[]) => void;
  removeChar: (id: string) => void;
  clearPool: () => void;
  toggleGoldGetter: (charId: string) => void;

  // ── 출근부 ──
  toggleAttendance: (name: string) => void;
  clearAttendance: () => void;
  toggleTargetMemberFilter: (name: string) => void;

  // ── 전광판(출발 제안) ──
  toggleDispatch: (id: string) => void;
  toggleBoardingFilter: (raidName: string) => void;

  // ── 파티/팀 CRUD ──
  addParty: (raidName: string) => void;
  deleteParty: (raidName: string, partyId: string) => void;
  togglePartyCheck: (raidName: string, partyId: string, checked: boolean) => void;
  addTeam: (raidName: string) => void;
  deleteTeam: (raidName: string, teamId: string) => void;
  toggleTeamCheck: (raidName: string, teamId: string, checked: boolean) => void;
  clearAllRaidFormations: () => void;

  // ── 드래그 앤 드롭 이동 ──
  moveMemberToParty: (raidName: string, partyId: string, member: PartyMember, toIndex?: number) => void;
  moveMemberToStandby: (raidName: string, member: PartyMember) => void;
  removeMemberFromFormation: (raidName: string, memberId: string) => void;
  reorderParties: (raidName: string, orderedIds: string[]) => void;

  // ── 자동 배치 (추후 로아 정식 API 로 교체될 모듈에서 호출) ──
  applyAutoMatchResult: (formations: RaidFormations) => void;

  // ── 건의사항 게시판 ──
  addSuggestion: (owner: string, content: string) => void;
  updateSuggestion: (id: string, content: string) => void;
  deleteSuggestion: (id: string) => void;
  setSuggestions: (list: Suggestion[]) => void;

  // ── 모드 & 동기화 ──
  setEditMode: (v: boolean) => void;
  getSnapshot: () => AppSnapshot;
  loadSnapshot: (snap: AppSnapshot) => void;
  commitHistory: () => void;
  undo: () => void;
}

export const useRaidStore = create<RaidState>((set, get) => ({
  characterPool: [],
  raidFormations: createEmptyFormations(),
  onlineMembers: [],
  activeDispatches: [],
  boardingFilters: [...RAID_ORDER],
  targetMemberFilter: null,
  isEditMode: false,
  suggestions: [],
  history: [],

  setCharacterPool: (pool) => set({ characterPool: pool }),

  addCharacters: (chars) =>
    set((state) => {
      const existingNames = new Set(state.characterPool.map((c) => c.name));
      const merged = [...state.characterPool];
      chars.forEach((c) => {
        const idx = merged.findIndex((m) => m.name === c.name);
        if (idx > -1) {
          merged[idx] = { ...merged[idx], ...c, id: merged[idx].id };
        } else if (!existingNames.has(c.name)) {
          merged.push(c);
        }
      });
      return { characterPool: merged };
    }),

  removeChar: (id) =>
    set((state) => ({ characterPool: state.characterPool.filter((c) => c.id !== id) })),

  clearPool: () => set({ characterPool: [] }),

  toggleGoldGetter: (charId) =>
    set((state) => ({
      characterPool: state.characterPool.map((c) =>
        c.id === charId ? { ...c, isGoldGetter: !c.isGoldGetter } : c
      ),
    })),

  toggleAttendance: (name) =>
    set((state) => {
      const isOnline = state.onlineMembers.includes(name);
      return {
        onlineMembers: isOnline
          ? state.onlineMembers.filter((o) => o !== name)
          : [...state.onlineMembers, name],
        targetMemberFilter: isOnline && state.targetMemberFilter === name ? null : state.targetMemberFilter,
      };
    }),

  clearAttendance: () => set({ onlineMembers: [], targetMemberFilter: null }),

  toggleTargetMemberFilter: (name) =>
    set((state) => ({
      targetMemberFilter: state.targetMemberFilter === name ? null : name,
    })),

  toggleDispatch: (id) =>
    set((state) => ({
      activeDispatches: state.activeDispatches.includes(id)
        ? state.activeDispatches.filter((d) => d !== id)
        : [...state.activeDispatches, id],
    })),

  toggleBoardingFilter: (raidName) =>
    set((state) => ({
      boardingFilters: state.boardingFilters.includes(raidName)
        ? state.boardingFilters.filter((r) => r !== raidName)
        : [...state.boardingFilters, raidName],
    })),

  addParty: (raidName) =>
    set((state) => {
      const rf = state.raidFormations[raidName];
      if (!rf || rf.type !== '4인') return {};
      const party: Party = {
        id: newId('party'),
        name: `${rf.parties.length + 1}파티`,
        members: [],
        checked: false,
      };
      return {
        raidFormations: {
          ...state.raidFormations,
          [raidName]: { ...rf, parties: [...rf.parties, party] },
        },
      };
    }),

  deleteParty: (raidName, partyId) =>
    set((state) => {
      const rf = state.raidFormations[raidName];
      if (!rf || rf.type !== '4인') return {};
      return {
        raidFormations: {
          ...state.raidFormations,
          [raidName]: { ...rf, parties: rf.parties.filter((p) => p.id !== partyId) },
        },
      };
    }),

  togglePartyCheck: (raidName, partyId, checked) =>
    set((state) => {
      const rf = state.raidFormations[raidName];
      if (!rf || rf.type !== '4인') return {};
      return {
        raidFormations: {
          ...state.raidFormations,
          [raidName]: {
            ...rf,
            parties: rf.parties.map((p) => (p.id === partyId ? { ...p, checked } : p)),
          },
        },
      };
    }),

  addTeam: (raidName) =>
    set((state) => {
      const rf = state.raidFormations[raidName];
      if (!rf || rf.type !== '8인') return {};
      const team: Team = {
        id: newId('team'),
        name: `${rf.teams.length + 1}공격대`,
        p1: { id: newId('p'), members: [] },
        p2: { id: newId('p'), members: [] },
        checked: false,
      };
      return {
        raidFormations: { ...state.raidFormations, [raidName]: { ...rf, teams: [...rf.teams, team] } },
      };
    }),

  deleteTeam: (raidName, teamId) =>
    set((state) => {
      const rf = state.raidFormations[raidName];
      if (!rf || rf.type !== '8인') return {};
      return {
        raidFormations: {
          ...state.raidFormations,
          [raidName]: { ...rf, teams: rf.teams.filter((t) => t.id !== teamId) },
        },
      };
    }),

  toggleTeamCheck: (raidName, teamId, checked) =>
    set((state) => {
      const rf = state.raidFormations[raidName];
      if (!rf || rf.type !== '8인') return {};
      return {
        raidFormations: {
          ...state.raidFormations,
          [raidName]: {
            ...rf,
            teams: rf.teams.map((t) => (t.id === teamId ? { ...t, checked } : t)),
          },
        },
      };
    }),

  clearAllRaidFormations: () => set({ raidFormations: createEmptyFormations() }),

  moveMemberToParty: (raidName, partyId, member, toIndex) =>
    set((state) => {
      const rf = state.raidFormations[raidName];
      if (!rf || rf.type !== '4인') return {};
      const parties = rf.parties.map((p) => ({ ...p, members: p.members.filter((m) => m.id !== member.id) }));
      const target = parties.find((p) => p.id === partyId);
      if (target) {
        const idx = toIndex === undefined ? target.members.length : toIndex;
        target.members = [...target.members.slice(0, idx), member, ...target.members.slice(idx)];
      }
      return { raidFormations: { ...state.raidFormations, [raidName]: { ...rf, parties } } };
    }),

  moveMemberToStandby: (raidName, member) =>
    set((state) => {
      const rf = state.raidFormations[raidName];
      if (!rf) return {};
      if (rf.type === '4인') {
        const parties = rf.parties.map((p) => ({ ...p, members: p.members.filter((m) => m.id !== member.id) }));
        return {
          raidFormations: {
            ...state.raidFormations,
            [raidName]: { ...rf, parties, standby: [...rf.standby, member] },
          },
        };
      }
      return {
        raidFormations: {
          ...state.raidFormations,
          [raidName]: { ...rf, standby: [...rf.standby, member] },
        },
      };
    }),

  removeMemberFromFormation: (raidName, memberId) =>
    set((state) => {
      const rf = state.raidFormations[raidName];
      if (!rf) return {};
      if (rf.type === '4인') {
        return {
          raidFormations: {
            ...state.raidFormations,
            [raidName]: {
              ...rf,
              parties: rf.parties.map((p) => ({ ...p, members: p.members.filter((m) => m.id !== memberId) })),
              standby: rf.standby.filter((m) => m.id !== memberId),
            },
          },
        };
      }
      return {
        raidFormations: {
          ...state.raidFormations,
          [raidName]: {
            ...rf,
            teams: rf.teams.map((t) => ({
              ...t,
              p1: { ...t.p1, members: t.p1.members.filter((m) => m.id !== memberId) },
              p2: { ...t.p2, members: t.p2.members.filter((m) => m.id !== memberId) },
            })),
            standby: rf.standby.filter((m) => m.id !== memberId),
          },
        },
      };
    }),

  reorderParties: (raidName, orderedIds) =>
    set((state) => {
      const rf = state.raidFormations[raidName];
      if (!rf || rf.type !== '4인') return {};
      const map = new Map(rf.parties.map((p) => [p.id, p]));
      const reordered = orderedIds.map((id) => map.get(id)).filter((p): p is Party => !!p);
      return { raidFormations: { ...state.raidFormations, [raidName]: { ...rf, parties: reordered } } };
    }),

  applyAutoMatchResult: (formations) => set({ raidFormations: formations }),

  addSuggestion: (owner, content) =>
    set((state) => ({
      suggestions: [
        { id: newId('sg'), owner, content, createdAt: Date.now() },
        ...state.suggestions,
      ],
    })),

  updateSuggestion: (id, content) =>
    set((state) => ({
      suggestions: state.suggestions.map((s) => (s.id === id ? { ...s, content } : s)),
    })),

  deleteSuggestion: (id) =>
    set((state) => ({ suggestions: state.suggestions.filter((s) => s.id !== id) })),

  setSuggestions: (list) => set({ suggestions: list }),

  setEditMode: (v) => set({ isEditMode: v }),

  getSnapshot: () => {
    const state = get();
    return {
      characterPool: state.characterPool,
      raidFormations: state.raidFormations,
      onlineMembers: state.onlineMembers,
      activeDispatches: state.activeDispatches,
    };
  },

  loadSnapshot: (snap) =>
    set({
      characterPool: snap.characterPool,
      raidFormations: snap.raidFormations,
      onlineMembers: snap.onlineMembers,
      activeDispatches: snap.activeDispatches,
    }),

  commitHistory: () =>
    set((state) => ({
      history: [...state.history.slice(-19), get().getSnapshot()],
    })),

  undo: () =>
    set((state) => {
      if (state.history.length === 0) return {};
      const prev = state.history[state.history.length - 1];
      return {
        characterPool: prev.characterPool,
        raidFormations: prev.raidFormations,
        onlineMembers: prev.onlineMembers,
        activeDispatches: prev.activeDispatches,
        history: state.history.slice(0, -1),
      };
    }),
}));

export { toPartyMember, findDuplicates };
