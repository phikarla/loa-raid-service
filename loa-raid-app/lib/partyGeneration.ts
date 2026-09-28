// 사과_V4 legacy-index.html 의 runAutoMatchAll() 이식
import type { Character, RaidFormations, PartyMember } from './types';
import { RAID_ORDER, RAID_FAMILY, RAID_MIN_LEVEL } from './raidConfig';

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

/**
 * 대기풀 캐릭터를 각 레이드의 "체크되지 않은(잠기지 않은)" 파티/팀 빈 슬롯에 자동으로 채워 넣습니다.
 * - 체크된(잠긴) 파티/팀과 그 인원은 그대로 유지합니다.
 * - 같은 레이드 그룹(RAID_FAMILY, 예: 지평의 성당 1~3단계)끼리만 중복 배치를 막습니다. 다른 레이드는 겹쳐도 됩니다.
 * - 레이드별 최소 템렙(RAID_MIN_LEVEL) 미만인 캐릭터는 후보에서 제외합니다.
 * - 같은 파티/팀 안에 같은 원정대(owner) 캐릭터가 2명 이상 들어가지 않도록 합니다.
 * - 4인 파티: 서폿 1 우선 배치 + 나머지 딜러는 시너지가 겹치지 않도록 우선 배치합니다.
 * - 8인 레이드(벨가르딘): 4인 파티 2개(p1/p2)를 동일한 규칙으로 채웁니다.
 * - 파티/팀이 하나도 없는 레이드는 후보 인원 수에 맞춰 자동으로 만듭니다.
 */
export function runAutoMatchAll(characterPool: Character[], current: RaidFormations): RaidFormations {
  // 레이드 그룹(family)별로 사용된 인원을 따로 추적 - 그룹 내에서만 중복 배치 금지
  const usedIdsByFamily = new Map<string, Set<string>>();
  function familyUsed(raidName: string): Set<string> {
    const family = RAID_FAMILY[raidName] ?? raidName;
    if (!usedIdsByFamily.has(family)) usedIdsByFamily.set(family, new Set());
    return usedIdsByFamily.get(family)!;
  }

  // 1. 이미 잠긴(체크된) 파티/팀 + 예비 대기열에 있는 인원은 해당 그룹에서 사용됨으로 표시
  // (예비 대기열은 "이번 주 쉬는 인원"으로 수동/강제 지정된 것이므로, 재자동배치 때 다시 끌려나오면 안 됨)
  RAID_ORDER.forEach((raidName) => {
    const rf = current[raidName];
    if (!rf) return;
    const used = familyUsed(raidName);
    if (rf.type === '4인') {
      rf.parties.forEach((p) => {
        if (p.checked) p.members.forEach((m) => used.add(m.id));
      });
    } else {
      rf.teams.forEach((t) => {
        if (t.checked) {
          t.p1.members.forEach((m) => used.add(m.id));
          t.p2.members.forEach((m) => used.add(m.id));
        }
      });
    }
    rf.standby.forEach((m) => used.add(m.id));
  });

  const next: RaidFormations = JSON.parse(JSON.stringify(current));

  RAID_ORDER.forEach((raidName) => {
    const rf = next[raidName];
    if (!rf) return;

    const used = familyUsed(raidName);
    const minLevel = RAID_MIN_LEVEL[raidName] ?? 0;

    // 이 레이드 컷을 통과하는 인원 중, 골드 수급 토글이 꺼진 캐릭터는 자동 배치 대상에서 빼고
    // 예비 대기열로 강제 이동시킴 (이번 주에 이 캐릭터로는 골드를 안 챙기겠다는 의미이므로)
    const eligible = characterPool.filter((c) => !used.has(c.id) && c.level >= minLevel);
    const forcedStandby = eligible.filter((c) => c.isGoldGetter !== true);

    // 이 레이드에서 사용 가능한 인원 풀(최소 템렙 이상 + 아직 안 쓰인 인원 + 골드 토글 켜짐)을 서폿 우선, 전투력 내림차순 정렬
    const pool = eligible
      .filter((c) => c.isGoldGetter === true)
      .sort((a, b) => {
        if (a.role === '서폿' && b.role !== '서폿') return -1;
        if (a.role !== '서폿' && b.role === '서폿') return 1;
        return (b.combatPower || 0) - (a.combatPower || 0);
      });

    function takeFourFor(usedSynergies: Set<string>, usedOwners: Set<string>): PartyMember[] {
      const picked: Character[] = [];
      // 서폿 1명 우선 (원정대 중복 제외)
      const supIdx = pool.findIndex((c) => c.role === '서폿' && !used.has(c.id) && !usedOwners.has(c.owner));
      if (supIdx > -1) {
        picked.push(pool[supIdx]);
        used.add(pool[supIdx].id);
        usedOwners.add(pool[supIdx].owner);
      }
      // 시너지 & 원정대 겹치지 않는 딜러 우선, 부족하면 원정대 중복만 피해서 채움
      while (picked.length < 4) {
        let idx = pool.findIndex(
          (c) => !used.has(c.id) && c.role !== '서폿' && !usedSynergies.has(c.synergy) && !usedOwners.has(c.owner)
        );
        if (idx === -1) {
          idx = pool.findIndex((c) => !used.has(c.id) && !usedOwners.has(c.owner));
        }
        if (idx === -1) break;
        picked.push(pool[idx]);
        used.add(pool[idx].id);
        usedSynergies.add(pool[idx].synergy);
        usedOwners.add(pool[idx].owner);
      }
      return picked.map(toMember);
    }

    // 빈 파티/팀이 하나도 없으면, 후보 인원 수에 맞춰 자동 생성
    if (rf.type === '4인' && rf.parties.length === 0 && pool.length > 0) {
      const partyCount = Math.ceil(pool.length / 4);
      for (let i = 0; i < partyCount; i++) {
        rf.parties.push({ id: newId('party'), name: `${i + 1}파티`, members: [], checked: false });
      }
    }
    if (rf.type === '8인' && rf.teams.length === 0 && pool.length > 0) {
      const teamCount = Math.ceil(pool.length / 8);
      for (let i = 0; i < teamCount; i++) {
        rf.teams.push({
          id: newId('team'),
          name: `${i + 1}공격대`,
          p1: { id: newId('p'), members: [] },
          p2: { id: newId('p'), members: [] },
          checked: false,
        });
      }
    }

    if (rf.type === '4인') {
      rf.parties.forEach((party) => {
        if (party.checked) return;
        const usedSynergies = new Set(party.members.map((m) => m.synergy));
        const usedOwners = new Set(party.members.map((m) => m.owner));
        const need = 4 - party.members.length;
        if (need > 0) {
          const filled = takeFourFor(usedSynergies, usedOwners).slice(0, need);
          party.members = [...party.members, ...filled];
        }
      });
    } else {
      rf.teams.forEach((team) => {
        if (team.checked) return;
        [team.p1, team.p2].forEach((half) => {
          const usedSynergies = new Set(half.members.map((m) => m.synergy));
          const usedOwners = new Set(half.members.map((m) => m.owner));
          const need = 4 - half.members.length;
          if (need > 0) {
            const filled = takeFourFor(usedSynergies, usedOwners).slice(0, need);
            half.members = [...half.members, ...filled];
          }
        });
      });
    }

    // 골드 토글이 꺼져서 이번 배치에서 제외된 인원을 예비 대기열에 합침 (이미 있으면 중복 추가 안 함)
    const existingStandbyIds = new Set(rf.standby.map((m) => m.id));
    forcedStandby.forEach((c) => {
      if (!existingStandbyIds.has(c.id)) {
        rf.standby.push(toMember(c));
        existingStandbyIds.add(c.id);
      }
    });
  });

  return next;
}

export { newId as generatePartyId };
