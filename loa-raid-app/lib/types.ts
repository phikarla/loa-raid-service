// 사과_V4(Apps Script) 이식 - 공통 타입 정의

export type Role = "딜러" | "서폿";
export type Synergy = "서폿" | "피증" | "방감" | "치피증" | "치적" | "공증" | "치저감" | "일반";

export interface Character {
  id: string;
  name: string;
  class: string;
  level: number;
  role: Role;
  synergy: Synergy;
  combatPower?: number; // 길드원이 직접 입력하는 전투력 (공식 API엔 없음)
  owner: string;
  isGoldGetter?: boolean;
  registeredBy?: string; // 이 캐릭터를 앱에 입력한 길드원의 표시 이름 (실제 원정대 주인과 다를 수 있음 - 대리 등록 가능)
  expeditionId?: string; // 소속 원정대 id (출석 토글 시 사용)
  expeditionAddedBy?: string; // 그 원정대를 등록한 길드원의 member id (출석 토글 권한 체크용)
}

export interface PartyMember {
  id: string; // characterPool 의 캐릭터 id 참조
  name: string;
  class: string;
  level: number;
  role: Role;
  synergy: Synergy;
  owner: string;
  registeredBy?: string;
  combatPower?: number;
  isGoldGetter?: boolean;
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

// 파티 편성표 드래그앤드롭에서 카드가 어디 있는지/어디로 가는지를 가리키는 위치 정보
export interface MemberLocation {
  raidName: string;
  partyId: string | null; // null = 예비 대기열
  support: boolean; // 서포터 슬롯인지 여부 (대기열이면 무의미)
  slotIndex: number; // 딜러 0~2, 서포터는 항상 0 (대기열이면 무의미)
}

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
