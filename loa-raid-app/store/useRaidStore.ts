'use client';
import { create } from 'zustand';
import type {
  Character,
  RaidFormations,
  RaidFormation,
  Party,
  Team,
  PartyMember,
  MemberLocation,
  Suggestion,
  AppSnapshot,
} from '../lib/types';
import { RAID_ORDER, RAID_FAMILY, RAID_MIN_LEVEL, is8PlayerRaid, findDuplicates, getSynergy } from '../lib/raidConfig';

// partyId 하나로 4인 파티든 8인 팀의 p1/p2든 원본을 찾아 인원 배열을 읽고/쓰는 헬퍼
// (partyId===null 이면 예비 대기열)
function getPartyMembers(rf: RaidFormation, partyId: string | null): PartyMember[] {
  if (partyId === null) return rf.standby;
  if (rf.type === '4인') return rf.parties.find((p) => p.id === partyId)?.members ?? [];
  for (const t of rf.teams) {
    if (t.p1.id === partyId) return t.p1.members;
    if (t.p2.id === partyId) return t.p2.members;
  }
  return [];
}

function withPartyMembers(rf: RaidFormation, partyId: string | null, members: PartyMember[]): RaidFormation {
  if (partyId === null) return { ...rf, standby: members };
  if (rf.type === '4인') {
    return { ...rf, parties: rf.parties.map((p) => (p.id === partyId ? { ...p, members } : p)) };
  }
  return {
    ...rf,
    teams: rf.teams.map((t) => {
      if (t.p1.id === partyId) return { ...t, p1: { ...t.p1, members } };
      if (t.p2.id === partyId) return { ...t, p2: { ...t.p2, members } };
      return t;
    }),
  };
}

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
    registeredBy: c.registeredBy,
    combatPower: c.combatPower,
    isGoldGetter: c.isGoldGetter,
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
  moveMember: (from: MemberLocation, to: MemberLocation, member: PartyMember) => void;
  removeMemberFromFormation: (raidName: string, memberId: string) => void;
  reorderParties: (raidName: string, orderedIds: string[]) => void;
  reorderTeams: (raidName: string, orderedIds: string[]) => void;

  // ── 자동 배치 (추후 로아 정식 API 로 교체될 모듈에서 호출) ──
  applyAutoMatchResult: (formations: RaidFormations) => void;

  // ── 안전 엔진: 대기풀(characterPool) 기준으로 이미 배치된 파티 스냅샷을 최신화 ──
  syncPartiesWithPool: () => { syncCount: number; migrationCount: number; restoredCount: number };

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

  // ── 길드 데이터 로드 (Supabase 에서 읽어온 값으로 통째로 교체) ──
  hydrateFromDb: (data: {
    characterPool: Character[];
    raidFormations: RaidFormations;
    onlineMembers: string[];
    suggestions: Suggestion[];
  }) => void;
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

  // 파티 해체 시 인원들은 사라지지 않고 예비 대기열로 복구됩니다.
  deleteParty: (raidName, partyId) =>
    set((state) => {
      const rf = state.raidFormations[raidName];
      if (!rf || rf.type !== '4인') return {};
      const party = rf.parties.find((p) => p.id === partyId);
      const standby = party ? [...rf.standby, ...party.members] : rf.standby;
      const parties = rf.parties.filter((p) => p.id !== partyId).map((p, idx) => ({ ...p, name: `${idx + 1}파티` }));
      return {
        raidFormations: { ...state.raidFormations, [raidName]: { ...rf, parties, standby } },
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

  // 공격대 팀 해체 시 인원들은 사라지지 않고 예비 대기열로 복구됩니다.
  deleteTeam: (raidName, teamId) =>
    set((state) => {
      const rf = state.raidFormations[raidName];
      if (!rf || rf.type !== '8인') return {};
      const team = rf.teams.find((t) => t.id === teamId);
      const standby = team ? [...rf.standby, ...team.p1.members, ...team.p2.members] : rf.standby;
      return {
        raidFormations: {
          ...state.raidFormations,
          [raidName]: { ...rf, teams: rf.teams.filter((t) => t.id !== teamId), standby },
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

  // 원본 웹앱의 SortableJS put()/onAdd() 로직 이식:
  // 1) 서로 다른 레이드 종류(벨가르딘/지평의 성당/세르카) 간 이동 금지
  // 2) 발키리를 제외하곤 딜러 슬롯<->서폿 슬롯 간 이동 금지
  // 3) 목적지 슬롯에 이미 누가 있으면 원래 있던 자리로 서로 자리를 교환(swap)
  moveMember: (from, to, member) =>
    set((state) => {
      if (RAID_FAMILY[from.raidName] !== RAID_FAMILY[to.raidName]) return {};

      if (to.partyId !== null && member.class !== '발키리') {
        if (to.support && member.role !== '서폿') return {};
        if (!to.support && member.role === '서폿') return {};
      }

      if (
        from.raidName === to.raidName &&
        from.partyId === to.partyId &&
        from.support === to.support &&
        from.slotIndex === to.slotIndex
      ) {
        return {};
      }

      let formations = state.raidFormations;
      const read = (loc: MemberLocation) => getPartyMembers(formations[loc.raidName], loc.partyId);
      const write = (loc: MemberLocation, members: PartyMember[]) => {
        formations = { ...formations, [loc.raidName]: withPartyMembers(formations[loc.raidName], loc.partyId, members) };
      };

      // 목적지 슬롯에 "원래" 있던 사람을 다른 변경을 가하기 전에 미리 파악해둠 (드래그한 본인이면 무시)
      const occupantOf = (loc: MemberLocation): PartyMember | undefined => {
        if (loc.partyId === null) return undefined;
        const bucket = read(loc).filter((m) => (loc.support ? m.role === '서폿' : m.role !== '서폿'));
        const occ = bucket[loc.slotIndex];
        return occ && occ.id !== member.id ? occ : undefined;
      };
      const evicted = occupantOf(to);

      // 발키리는 놓인 슬롯 종류에 따라 역할/시너지가 자동으로 전환됨(딜러 슬롯→딜러, 서폿 슬롯→서폿).
      // 대기열로 돌아가면 원정대 현황에서 설정해둔 기본 역할로 되돌아감.
      let placedMember = member;
      if (member.class === '발키리') {
        if (to.partyId !== null) {
          const role = to.support ? '서폿' : '딜러';
          if (role !== member.role) placedMember = { ...member, role, synergy: getSynergy(member.class, role) };
        } else {
          const base = state.characterPool.find((c) => c.id === member.id);
          if (base && (base.role !== member.role || base.synergy !== member.synergy)) {
            placedMember = { ...member, role: base.role, synergy: base.synergy };
          }
        }
      }

      if (from.raidName === to.raidName && from.partyId === to.partyId && to.partyId !== null) {
        // 같은 파티/공격대 안에서의 슬롯 이동: 같은 배열을 지웠다 다시 채우면 인덱스가 밀려서
        // 손대지 않은 다른 인원까지 엉뚱하게 딸려 움직이므로, 절대 인덱스 기준으로 두 사람
        // 자리만 정확히 맞바꾼다(원본 웹앱의 onAdd swap과 동일한 결과).
        const arr = [...read(from)];
        const draggedIdx = arr.findIndex((m) => m.id === member.id);
        if (evicted) {
          const evictedIdx = arr.findIndex((m) => m.id === evicted.id);
          arr[draggedIdx] = evicted;
          arr[evictedIdx] = placedMember;
        }
        write(from, arr);
        return { raidFormations: formations };
      }

      write(from, read(from).filter((m) => m.id !== member.id));
      if (evicted) write(to, read(to).filter((m) => m.id !== evicted.id));

      if (to.partyId === null) {
        write(to, [...read(to), placedMember]);
      } else {
        const dealers = read(to).filter((m) => m.role !== '서폿');
        const supports = read(to).filter((m) => m.role === '서폿');
        const bucket = to.support ? supports : dealers;
        const idx = Math.min(to.slotIndex, bucket.length);
        bucket.splice(idx, 0, placedMember);
        write(to, [...dealers, ...supports]);
      }

      if (evicted) {
        if (from.partyId === null) {
          write(from, [...read(from), evicted]);
        } else {
          const fromDealers = read(from).filter((m) => m.role !== '서폿');
          const fromSupports = read(from).filter((m) => m.role === '서폿');
          const fromBucket = from.support ? fromSupports : fromDealers;
          const fromIdx = Math.min(from.slotIndex, fromBucket.length);
          fromBucket.splice(fromIdx, 0, evicted);
          write(from, [...fromDealers, ...fromSupports]);
        }
      }

      return { raidFormations: formations };
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

  reorderTeams: (raidName, orderedIds) =>
    set((state) => {
      const rf = state.raidFormations[raidName];
      if (!rf || rf.type !== '8인') return {};
      const map = new Map(rf.teams.map((t) => [t.id, t]));
      const reordered = orderedIds.map((id) => map.get(id)).filter((t): t is Team => !!t);
      return { raidFormations: { ...state.raidFormations, [raidName]: { ...rf, teams: reordered } } };
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

  // 대기풀(characterPool)이 최신 소스오브트루스라는 전제 하에, 이미 파티/팀/대기열에 배치되어 있는
  // 캐릭터 스냅샷을 최신 스탯으로 맞추고(재수집·소유주 이관 등으로 대기풀만 바뀐 경우 대비),
  // 레벨업으로 상위 난이도 컷을 새로 넘었으면 그 레이드로 승급 이사시키고,
  // 어느 레이드 그룹에도 전혀 배치돼있지 않은 캐릭터는 해당 그룹 최상위 레이드의 대기열로 복구한다.
  syncPartiesWithPool: () => {
    let syncCount = 0;
    let migrationCount = 0;
    let restoredCount = 0;

    set((state) => {
      const familyRaids: Record<string, string[]> = {};
      RAID_ORDER.forEach((r) => {
        const fam = RAID_FAMILY[r];
        if (!fam) return;
        (familyRaids[fam] ??= []).push(r);
      });

      const formations: RaidFormations = JSON.parse(JSON.stringify(state.raidFormations));

      state.characterPool.forEach((poolChar) => {
        const foundInFamily: Record<string, boolean> = {};

        RAID_ORDER.forEach((raidName) => {
          const rf = formations[raidName];
          if (!rf) return;
          const family = RAID_FAMILY[raidName];

          function processMember(arr: PartyMember[], index: number) {
            if (family) foundInFamily[family] = true;
            const charInParty = arr[index];
            const oldLevel = charInParty.level;
            const newLevel = poolChar.level;

            const changed =
              charInParty.level !== poolChar.level ||
              charInParty.combatPower !== poolChar.combatPower ||
              charInParty.class !== poolChar.class ||
              charInParty.role !== poolChar.role ||
              charInParty.synergy !== poolChar.synergy ||
              charInParty.owner !== poolChar.owner ||
              charInParty.isGoldGetter !== poolChar.isGoldGetter;
            if (changed) {
              arr[index] = toPartyMember(poolChar);
              syncCount++;
            }

            // 레벨이 올라서(newLevel > oldLevel) 같은 그룹의 상위 레이드 컷을 새로 넘었다면 승급 이사
            if (changed && newLevel > oldLevel && family) {
              const groupRaids = familyRaids[family];
              const currentIdx = groupRaids.indexOf(raidName);
              let targetRaid: string | null = null;
              for (let i = 0; i < currentIdx; i++) {
                const checkRaid = groupRaids[i];
                const minLvl = RAID_MIN_LEVEL[checkRaid] ?? 0;
                if (oldLevel < minLvl && newLevel >= minLvl) {
                  targetRaid = checkRaid;
                  break;
                }
              }
              if (targetRaid) {
                arr.splice(index, 1);
                migrationCount++;
                const targetRf = formations[targetRaid];
                if (targetRf) {
                  if (targetRf.type === '8인') {
                    targetRf.teams.push({
                      id: newId('team'),
                      name: `${targetRf.teams.length + 1}공격대`,
                      checked: false,
                      p1: { id: newId('p'), members: [toPartyMember(poolChar)] },
                      p2: { id: newId('p'), members: [] },
                    });
                  } else {
                    targetRf.parties.push({
                      id: newId('party'),
                      name: `${targetRf.parties.length + 1}파티`,
                      members: [toPartyMember(poolChar)],
                      checked: false,
                    });
                  }
                }
              }
            }
          }

          if (rf.type === '8인') {
            rf.teams.forEach((t) => {
              const i1 = t.p1.members.findIndex((m) => m.id === poolChar.id);
              if (i1 > -1) processMember(t.p1.members, i1);
              const i2 = t.p2.members.findIndex((m) => m.id === poolChar.id);
              if (i2 > -1) processMember(t.p2.members, i2);
            });
          } else {
            rf.parties.forEach((p) => {
              const i = p.members.findIndex((m) => m.id === poolChar.id);
              if (i > -1) processMember(p.members, i);
            });
          }
          const si = rf.standby.findIndex((m) => m.id === poolChar.id);
          if (si > -1) processMember(rf.standby, si);
        });

        // 미아 복구: 그룹 어디에도 없으면 그 그룹에서 레벨이 닿는 최상위 레이드의 대기열로
        Object.entries(familyRaids).forEach(([family, raids]) => {
          if (foundInFamily[family]) return;
          for (const raidName of raids) {
            const minLvl = RAID_MIN_LEVEL[raidName] ?? 0;
            if (poolChar.level >= minLvl) {
              formations[raidName].standby.push(toPartyMember(poolChar));
              restoredCount++;
              break;
            }
          }
        });
      });

      if (syncCount === 0 && migrationCount === 0 && restoredCount === 0) return {};
      return { raidFormations: formations };
    });

    return { syncCount, migrationCount, restoredCount };
  },

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

  hydrateFromDb: ({ characterPool, raidFormations, onlineMembers, suggestions }) =>
    set(() => {
      const formations = createEmptyFormations();
      Object.entries(raidFormations).forEach(([raidName, rf]) => {
        if (formations[raidName]) formations[raidName] = rf;
      });
      return { characterPool, raidFormations: formations, onlineMembers, suggestions };
    }),
}));

export { toPartyMember, findDuplicates };
