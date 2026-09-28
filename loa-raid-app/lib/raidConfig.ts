// 사과_V4 legacy-index.html 이식 - 원정대/레이드 관련 상수 & 순수 함수
import type { CSSProperties } from "react";
import type { Synergy, Role } from "./types";

export const RAID_ORDER: string[] = [
  "[하드] 벨가르딘",
  "[노말] 벨가르딘",
  "[나메] 세르카",
  "[하드] 세르카",
  "[3단계] 지평의 성당",
  "[2단계] 지평의 성당",
  "[1단계] 지평의 성당",
];

export function is8PlayerRaid(raidName: string): boolean {
  return raidName.includes("벨가르딘");
}

// 같은 레이드의 난이도끼리만 묶어서 "이 그룹 내에서는 중복 배치 금지"를 판단하는 용도.
// (다른 레이드 그룹끼리는 같은 주에 둘 다 참여 가능하므로 겹쳐도 됨)
export const RAID_FAMILY: Record<string, string> = {
  "[하드] 벨가르딘": "벨가르딘",
  "[노말] 벨가르딘": "벨가르딘",
  "[나메] 세르카": "세르카",
  "[하드] 세르카": "세르카",
  "[3단계] 지평의 성당": "지평의 성당",
  "[2단계] 지평의 성당": "지평의 성당",
  "[1단계] 지평의 성당": "지평의 성당",
};

// 실제 라이브 앱(script.google.com)의 buildDashboardSummary() 레벨 컷 그대로 이식
export const RAID_MIN_LEVEL: Record<string, number> = {
  "[하드] 벨가르딘": 1770,
  "[노말] 벨가르딘": 1750,
  "[나메] 세르카": 1770,
  "[하드] 세르카": 1730,
  "[3단계] 지평의 성당": 1750,
  "[2단계] 지평의 성당": 1720,
  "[1단계] 지평의 성당": 1700,
};

export const RAID_MAX_LEVEL: Record<string, number> = {
  "[하드] 벨가르딘": 9999,
  "[노말] 벨가르딘": 1770,
  "[나메] 세르카": 9999,
  "[하드] 세르카": 1770,
  "[3단계] 지평의 성당": 9999,
  "[2단계] 지평의 성당": 1750,
  "[1단계] 지평의 성당": 1720,
};

// 파티 편성표에서 레이드를 3개 그룹으로 묶어서 보여줄 때 쓰는 섹션 메타데이터
export const RAID_SECTIONS: { title: string; icon: string; borderClass: string; raids: string[] }[] = [
  {
    title: "벨가르딘 (하드 / 노말)",
    icon: "fa-solid fa-skull-crossbones",
    borderClass: "border-rose-500",
    raids: ["[하드] 벨가르딘", "[노말] 벨가르딘"],
  },
  {
    title: "지평의 성당 (3 / 2 / 1단계)",
    icon: "fa-solid fa-church",
    borderClass: "border-indigo-500",
    raids: ["[3단계] 지평의 성당", "[2단계] 지평의 성당", "[1단계] 지평의 성당"],
  },
  {
    title: "세르카 (나메 / 하드)",
    icon: "fa-solid fa-dragon",
    borderClass: "border-amber-500",
    raids: ["[나메] 세르카", "[하드] 세르카"],
  },
];

// 서포터 직업 목록
export const SUPPORT_CLASSES = ["바드", "도화가", "홀리나이트", "발키리"];

// 직업 + 역할 -> 시너지 그룹 산출 (Code.gs getSynergy 포팅)
const SYNERGY_GROUPS: Record<Exclude<Synergy, "서폿" | "일반">, string[]> = {
  피증: ["소울이터", "브레이커", "소서리스", "데모닉", "슬레이어", "인파이터", "버서커", "가디언나이트", "블레이드", "호크아이"],
  방감: ["서머너", "블래스터", "디스트로이어", "리퍼", "워로드", "환수사", "차원술사"],
  치피증: ["창술사", "발키리"],
  치적: ["배틀마스터", "아르카나", "스트라이커", "데빌헌터", "건슬링어"],
  공증: ["스카우터", "기공사"],
  치저감: ["기상술사"],
};

export function getSynergy(job: string, role: Role | string): Synergy {
  if (role === "서폿") return "서폿";
  for (const key of Object.keys(SYNERGY_GROUPS) as (keyof typeof SYNERGY_GROUPS)[]) {
    if (SYNERGY_GROUPS[key].includes(job)) return key;
  }
  return "일반";
}

export const SYNERGY_STYLES: Record<Synergy, string> = {
  서폿: "bg-pink-500/10 text-pink-400 border border-pink-500/20",
  피증: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  방감: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  치피증: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
  치적: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  공증: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  치저감: "bg-red-500/10 text-red-400 border border-red-500/20",
  일반: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
};

export function findDuplicates(arr: string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  arr.forEach((item) => {
    if (seen.has(item)) dups.add(item);
    seen.add(item);
  });
  return [...dups];
}

export function getPartyNumber(name: string): number {
  const match = String(name || "").match(/\d+/);
  return match ? parseInt(match[0], 10) : 999;
}

export function sanitizeScore(score: unknown): number {
  const n = parseFloat(String(score));
  return Number.isFinite(n) ? n : 0;
}

// 길드원 개인별 고정 색상이 없을 때, id 기반으로 안정적인 hex 색상을 생성
export function hashColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  const h = hue / 360, s = 0.7, l = 0.6;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// 원정대(owner) 이름 기준 왼쪽 색상 띠 - Tailwind는 런타임에 만든 임의 색상 클래스를 못 읽으므로 인라인 style로 반환
export function ownerBorderStyle(owner?: string): CSSProperties {
  if (!owner) return { borderLeft: '8px solid #334155' };
  return { borderLeft: `8px solid ${hashColor(owner)}` };
}
