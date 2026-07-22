// 사과_V4 legacy-index.html 의 runAutoMatchAll() 이식
// ⚠️ 사용자 요청에 따라 "자동 배치 알고리즘"을 별도 모듈로 격리했습니다.
//    추후 로스트아크 정식 API 기반 로직으로 이 파일만 교체하면 됩니다.
import type { Character, RaidFormations, PartyMember } from './types';
import { RAID_ORDER, is8PlayerRaid } from './raidConfig';

function toMember(c: Character): PartyMember {
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

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 대기풀 캐릭터를 각 레이드의 "체크되지 않은(잠기지 않은)" 파티/팀 빈 슬롯에 자동으로 채워 넣습니다.
 * - 체크된(잠긴) 파티/팀과 그 인원은 그대로 유지합니다.
 * - 4인 파티: 서폿 1 우선 배치 + 나머지 딜러는 시너지가 겹치지 않도록 우선 배치합니다.
 * - 8인 레이드(벨가르딘): 4인 파티 2개(p1/p2)를 동일한 규칙으로 채웁니다.
 */
export function runAutoMatchAll(characterPool: Character[], current: RaidFormations): RaidFormations {
  const usedIds = new Set<string>();

  // 1. 이미 잠긴(체크된) 파티/팀에 배치된 인원은 사용됨으로 표시
  RAID_ORDER.forEach((raidName) => {
    const rf = current[raidName];
    if (!rf) return;
    if (rf.type === '4인') {
      rf.parties.forEach((p) => {
        if (p.checked) p.members.forEach((m) => usedIds.add(m.id));
      });
    } else {
      rf.teams.forEach((t) => {
        if (t.checked) {
          t.p1.members.forEach((m) => usedIds.add(m.id));
          t.p2.members.forEach((m) => usedIds.add(m.id));
        }
      });
    }
  });

  const next: RaidFormations = JSON.parse(JSON.stringify(current));

  RAID_ORDER.forEach((raidName) => {
    const rf = next[raidName];
    if (!rf) return;

    // 이 레이드에서 사용 가능한 인원 풀(전체 대기풀 - 이미 사용된 인원)을 서폿 우선 정렬
    const pool = characterPool
      .filter((c) => !usedIds.has(c.id))
      .sort((a, b) => {
        if (a.role === '서폿' && b.role !== '서폿') return -1;
        if (a.role !== '서폿' && b.role === '서폿') return 1;
        return (b.lopecScore || 0) - (a.lopecScore || 0);
      });

    function takeFourFor(usedSynergies: Set<string>): PartyMember[] {
      const picked: Character[] = [];
      // 서폿 1명 우선
      const supIdx = pool.findIndex((c) => c.role === '서폿' && !usedIds.has(c.id));
      if (supIdx > -1) {
        picked.push(pool[supIdx]);
        usedIds.add(pool[supIdx].id);
      }
      // 시너지 겹치지 않는 딜러 우선, 부족하면 아무나 채움
      while (picked.length < 4) {
        let idx = pool.findIndex(
          (c) => !usedIds.has(c.id) && c.role !== '서폿' && !usedSynergies.has(c.synergy)
        );
        if (idx === -1) idx = pool.findIndex((c) => !usedIds.has(c.id));
        if (idx === -1) break;
        picked.push(pool[idx]);
        usedIds.add(pool[idx].id);
        usedSynergies.add(pool[idx].synergy);
      }
      return picked.map(toMember);
    }

    if (rf.type === '4인') {
      rf.parties.forEach((party) => {
        if (party.checked) return;
        const usedSynergies = new Set(party.members.filter((m) => m.role === '서폿' ? false : true).map((m) => m.synergy));
        const need = 4 - party.members.length;
        if (need > 0) {
          const filled = takeFourFor(usedSynergies).slice(0, need);
          party.members = [...party.members, ...filled];
        }
      });
    } else {
      rf.teams.forEach((team) => {
        if (team.checked) return;
        [team.p1, team.p2].forEach((half) => {
          const usedSynergies = new Set(half.members.map((m) => m.synergy));
          const need = 4 - half.members.length;
          if (need > 0) {
            const filled = takeFourFor(usedSynergies).slice(0, need);
            half.members = [...half.members, ...filled];
          }
        });
      });
    }
  });

  return next;
}

export { newId as generatePartyId };
