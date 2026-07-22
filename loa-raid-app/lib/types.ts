// 사과_V4(Apps Script) 이식 - 공통 타입 정의

export type Role = "딜러" | "서폿";
export type Synergy = "서폿" | "피증" | "방깍" | "치피증" | "치적" | "공증" | "일반";

export interface Character {
  id: string;
  name: string;
  class: string;
  level: number;
  role: Role;
  synergy: Synergy;
  lopecScore?: number;
  ingameScore?: number;
  owner: string;
  isGoldGetter?: boolean;
}

export interface PartyMember {
  id: string; // characterPool 의 캐릭터 id 참조
  name: string;
  class: string;
  level: number;
  role: Role;
  synergy: Synergy;
  owner: string;
}

// 4인 파티 (지평의 성당 / 세르카 등)
export interface Party {
  id: string;
  name: string; // 예: "1파티"
  members: PartyMember[];
  checked: boolean; // 체크 시 자동배치/전광판에서 잠금(제외)
}

// 8인 레이드(벨가르딘)는 4인 파티 2개(p1, p2)가 합쳐진 "팀" 구조
export interface Team {
  id: string;
  name: string; // 예: "1공격대"
  p1: { id: string; members: PartyMember[] };
  p2: { id: string; members: PartyMember[] };
  checked: boolean;
}

export interface RaidFormation4 {
  type: "4인";
  parties: Party[];
  standby: PartyMember[];
}

export interface RaidFormation8 {
  type: "8인";
  teams: Team[];
  standby: PartyMember[];
}

export type RaidFormation = RaidFormation4 | RaidFormation8;

export type RaidFormations = Record<string, RaidFormation>;

export interface Suggestion {
  id: string;
  owner: string;
  content: string;
  createdAt: number;
}

export interface AppSnapshot {
  characterPool: Character[];
  raidFormations: RaidFormations;
  onlineMembers: string[];
  activeDispatches: string[];
}
