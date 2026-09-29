// 사과_V4 legacy-index.html 의 runAutoMatchAll() 이식
// (2026-09 재작성: 기존 포팅이 원본의 "점수 기반 최적 배치" 알고리즘을 놓치고 있어서 처음부터 다시 이식함)
import type { Character, RaidFormations, RaidFormation, Party, Team, PartyMember } from './types';
import { RAID_ORDER, RAID_FAMILY, RAID_MIN_LEVEL, RAID_MAX_LEVEL } from './raidConfig';

function toMember(c: Character): PartyMember {
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

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface TeamSlotOption {
  team: Team;
  side: 'p1' | 'p2';
}

/**
 * 대기풀 캐릭터를 각 레이드의 파티/팀에 자동으로 채워 넣습니다 (legacy runAutoMatchAll 원본 알고리즘 그대로 이식).
 * - 체크된(잠긴) 파티/팀과 그 인원, 그리고 예비 대기열 인원은 해당 레이드 그룹(RAID_FAMILY) 안에서 "이미 사용됨"으로 보고 건드리지 않습니다.
 * - 레벨 컷을 통과 못 하거나, 골드 획득 토글이 꺼진 캐릭터는 배정 대상에서 빠지고 예비 대기열로 강제 이동합니다.
 * - 배정 대상 인원은 "같은 레이드에 배정 가능한 캐릭터 수가 많은 원정대 우선, 그다음 전투력 내림차순"으로 정렬됩니다.
 * - 서포터를 먼저 배치하고, 남은 딜러(+배치 못한 서포터)를 이어서 배치합니다.
 * - 각 캐릭터는 활성 파티/팀들 중 "원정대 중복이면 즉시 탈락, 직업 중복이면 감점, 인원이 적을수록 우선"으로 점수를 매겨 가장 적합한 곳에 들어갑니다.
 * - 8인 레이드는 같은 팀의 p1/p2 두 파티를 합쳐서 원정대/직업 중복을 검사합니다.
 * - 기존에 체크(완료)되지 않은 파티/팀은 매번 새로 계산해서 다시 만듭니다 (체크된 것만 보존됩니다).
 */
export function runAutoMatchAll(characterPool: Character[], current: RaidFormations): RaidFormations {
  const next: RaidFormations = JSON.parse(JSON.stringify(current));

  // 1. 레이드 그룹(family)별로 "이미 잠긴(체크) 파티/팀 인원 + 예비 대기열 인원"을 사용됨으로 표시
  const lockedByFamily = new Map<string, Set<string>>();
  const matchedByFamily = new Map<string, Set<string>>();
  function familySet(map: Map<string, Set<string>>, family: string): Set<string> {
    if (!map.has(family)) map.set(family, new Set());
    return map.get(family)!;
  }

  RAID_ORDER.forEach((raidName) => {
    const rf = next[raidName];
    if (!rf) return;
    const family = RAID_FAMILY[raidName] ?? raidName;
    const locked = familySet(lockedByFamily, family);
    const matched = familySet(matchedByFamily, family);
    if (rf.type === '8인') {
      rf.teams.forEach((t) => {
        if (t.checked) {
          t.p1.members.forEach((m) => {
            locked.add(m.id);
            matched.add(m.id);
          });
          t.p2.members.forEach((m) => {
            locked.add(m.id);
            matched.add(m.id);
          });
        }
      });
    } else {
      rf.parties.forEach((p) => {
        if (p.checked) {
          p.members.forEach((m) => {
            locked.add(m.id);
            matched.add(m.id);
          });
        }
      });
    }
    rf.standby.forEach((m) => {
      locked.add(m.id);
      matched.add(m.id);
    });
  });

  RAID_ORDER.forEach((raidName) => {
    const rf = next[raidName];
    if (!rf) return;

    const is8Player = rf.type === '8인';

    // 이 레이드가 전부 잠겨있으면(모든 파티/팀이 체크됨) 건드리지 않음
    if (is8Player) {
      if (rf.teams.length > 0 && rf.teams.every((t) => t.checked)) return;
    } else {
      if (rf.parties.length > 0 && rf.parties.every((p) => p.checked)) return;
    }

    const family = RAID_FAMILY[raidName] ?? raidName;
    const locked = familySet(lockedByFamily, family);
    const matched = familySet(matchedByFamily, family);
    const minLvl = RAID_MIN_LEVEL[raidName] ?? 0;
    const maxLvl = RAID_MAX_LEVEL[raidName] ?? Infinity;

    // 이 레이드 컷을 통과하는 유효 캐릭터 필터링
    let qualified = characterPool.filter((c) => {
      if (locked.has(c.id) || matched.has(c.id)) return false;
      return c.level >= minLvl && c.level < maxLvl;
    });

    // 골드 토글이 꺼진 캐릭터는 배정 대상에서 빼고 이 레이드의 예비 대기열로 강제 이동
    const forcedStandby: Character[] = [];
    const autoAssignable: Character[] = [];
    qualified.forEach((c) => {
      if (c.isGoldGetter !== true) forcedStandby.push(c);
      else autoAssignable.push(c);
    });
    qualified = autoAssignable;

    if (qualified.length === 0 && forcedStandby.length === 0) return;

    // 같은 레이드에 배정 가능한 캐릭터 수가 많은 원정대 우선, 그다음 전투력 내림차순
    const ownerCounts = new Map<string, number>();
    qualified.forEach((c) => ownerCounts.set(c.owner, (ownerCounts.get(c.owner) ?? 0) + 1));
    const byOwnerCountThenScore = (a: Character, b: Character): number => {
      const diff = (ownerCounts.get(b.owner) ?? 0) - (ownerCounts.get(a.owner) ?? 0);
      if (diff !== 0) return diff;
      return (b.combatPower || 0) - (a.combatPower || 0);
    };

    const supporters = qualified.filter((c) => c.role === '서폿').sort(byOwnerCountThenScore);
    const dealers = qualified.filter((c) => c.role !== '서폿').sort(byOwnerCountThenScore);

    // 파티/팀 개수 산정
    let partyCount = 0;
    let teamCount = 0;
    if (is8Player) {
      const neededByDealers = Math.ceil(dealers.length / 6); // 8인은 한 팀에 딜러 6명
      const availableSups = Math.floor(supporters.length / 2); // 한 팀에 서폿 2명
      teamCount = Math.max(neededByDealers, availableSups, 1);
    } else {
      const neededByDealers = Math.ceil(dealers.length / 3);
      partyCount = Math.max(supporters.length, neededByDealers, 1);
    }

    // 체크(완료)된 것만 보존하고 나머지 파티/팀은 새로 만듦
    const preservedTeams = is8Player ? rf.teams.filter((t) => t.checked) : [];
    const preservedParties = !is8Player ? rf.parties.filter((p) => p.checked) : [];

    const teams: Team[] = [...preservedTeams];
    const parties: Party[] = [...preservedParties];

    if (is8Player) {
      for (let i = 0; i < teamCount; i++) {
        teams.push({
          id: newId('team'),
          name: `${teams.length + 1}공격대`,
          checked: false,
          p1: { id: newId('p'), members: [] },
          p2: { id: newId('p'), members: [] },
        });
      }
    } else {
      for (let i = 0; i < partyCount; i++) {
        parties.push({ id: newId('party'), name: `${parties.length + 1}파티`, members: [], checked: false });
      }
    }

    const activeTeams = teams.filter((t) => !t.checked);
    const activeParties = parties.filter((p) => !p.checked);

    // 원정대 중복이면 즉시 탈락(-999999), 직업 중복이면 감점(-400), 인원 적은 쪽 우선(-members*10)
    function assignCharacter(char: Character, isSupport: boolean): boolean {
      if (is8Player) {
        const options: TeamSlotOption[] = [];
        activeTeams.forEach((t) => {
          if (isSupport) {
            if (t.p1.members.filter((m) => m.role === '서폿').length === 0) options.push({ team: t, side: 'p1' });
            if (t.p2.members.filter((m) => m.role === '서폿').length === 0) options.push({ team: t, side: 'p2' });
          } else {
            if (t.p1.members.filter((m) => m.role !== '서폿').length < 3) options.push({ team: t, side: 'p1' });
            if (t.p2.members.filter((m) => m.role !== '서폿').length < 3) options.push({ team: t, side: 'p2' });
          }
        });
        if (options.length === 0) return false;

        const scored = options.map((opt) => {
          const partyObj = opt.side === 'p1' ? opt.team.p1 : opt.team.p2;
          const peer = opt.side === 'p1' ? opt.team.p2 : opt.team.p1;
          const combined = [...partyObj.members, ...peer.members];
          let score = 1000;
          if (combined.some((m) => m.owner === char.owner)) score -= 999999;
          if (combined.filter((m) => m.class === char.class).length >= 2) score -= 400;
          score -= partyObj.members.length * 10;
          return { opt, score };
        });
        scored.sort((a, b) => b.score - a.score);
        if (scored[0].score > -500000) {
          const best = scored[0].opt;
          const partyObj = best.side === 'p1' ? best.team.p1 : best.team.p2;
          partyObj.members.push(toMember(char));
          return true;
        }
        return false;
      } else {
        const available = activeParties.filter((p) =>
          isSupport ? p.members.filter((m) => m.role === '서폿').length === 0 : p.members.filter((m) => m.role !== '서폿').length < 3
        );
        if (available.length === 0) return false;

        const scored = available.map((p) => {
          let score = 1000;
          if (p.members.some((m) => m.owner === char.owner)) score -= 999999;
          if (p.members.some((m) => m.class === char.class)) score -= 400;
          score -= p.members.length * 10;
          return { p, score };
        });
        scored.sort((a, b) => b.score - a.score);
        if (scored[0].score > -500000) {
          scored[0].p.members.push(toMember(char));
          return true;
        }
        return false;
      }
    }

    // 서포터 먼저 중복 배정 제어
    const unallocatedSups: Character[] = [];
    supporters.forEach((sup) => {
      if (assignCharacter(sup, true)) matched.add(sup.id);
      else unallocatedSups.push(sup);
    });

    // 남은 딜러 + 배치 못한 서포터를 이어서 배치 (본래 역할대로 서폿 슬롯/딜러 슬롯 판별)
    const combinedDealers = [...dealers, ...unallocatedSups].sort(byOwnerCountThenScore);
    combinedDealers.forEach((char) => {
      const isSupportChar = char.role === '서폿';
      const assigned = assignCharacter(char, isSupportChar);
      if (!assigned) {
        // 들어갈 빈자리가 없으면 새 팀/파티를 열어서 배정
        if (is8Player) {
          const newTeam: Team = {
            id: newId('team'),
            name: `${teams.length + 1}공격대`,
            checked: false,
            p1: { id: newId('p'), members: [toMember(char)] },
            p2: { id: newId('p'), members: [] },
          };
          teams.push(newTeam);
          activeTeams.push(newTeam);
        } else {
          const newP: Party = { id: newId('party'), name: `${parties.length + 1}파티`, members: [toMember(char)], checked: false };
          parties.push(newP);
          activeParties.push(newP);
        }
      }
      matched.add(char.id);
    });

    if (is8Player) {
      // 중간에 빈 팀이 생겨도 세트는 보존하고, 꼬리에 남은 완전히 빈 팀만 정리
      while (teams.length > 0) {
        const last = teams[teams.length - 1];
        if (!last.checked && last.p1.members.length === 0 && last.p2.members.length === 0) teams.pop();
        else break;
      }
      next[raidName] = {
        type: '8인',
        teams,
        standby: [...rf.standby, ...forcedStandby.map(toMember)],
      };
    } else {
      // 빈 미체크 파티는 제거하고, 미체크 파티만 순번대로 이름 재부여
      const filtered = parties.filter((p) => p.members.length > 0 || p.checked);
      let idx = 0;
      const renamed = filtered.map((p) => {
        if (p.checked) return p;
        idx++;
        return { ...p, name: `${idx}파티` };
      });
      next[raidName] = {
        type: '4인',
        parties: renamed,
        standby: [...rf.standby, ...forcedStandby.map(toMember)],
      };
    }
  });

  return next;
}

export { newId as generatePartyId };
