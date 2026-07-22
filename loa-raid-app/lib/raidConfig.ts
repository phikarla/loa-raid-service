// 사과_V4 legacy-index.html 이식 - 원정대/레이드 관련 상수 & 순수 함수
import type { Synergy, Role } from "./types";

export const RAID_ORDER: string[] = [
  "[하드] 벨가르딘",
  "[노말] 벨가르딘",
  "[하드] 세르카",
  "[3단계] 지평의 성당",
  "[2단계] 지평의 성당",
  "[1단계] 지평의 성당",
];

export function is8PlayerRaid(raidName: string): boolean {
  return raidName.includes("벨가르딘");
}

// 원정대 대표 닉네임 <-> 약어 매핑
export const ALIAS_MAP: Record<string, string> = {
  유네사: "네사", 네사: "네사",
  토리이잉: "토리", 토리: "토리",
  밤구대장: "밤구", 밤구: "밤구",
  박츄바: "추바", 추바: "추바",
  달뜬달: "무도", 무도: "무도",
  도남건랜스: "도남", 도남: "도남",
  충치가몇개냐뭐: "충치", 충치: "충치",
  퍄퍗: "퍄퍗",
  Mccurter: "까따", 까따: "까따",
};

// 오늘의 출근부 9인 고정 멤버(약어 기준)
export const FIXED_MEMBERS: string[] = ["네사", "토리", "밤구", "추바", "무도", "도남", "충치", "퍄퍗", "까따"];

export const OWNER_COLORS: Record<string, string> = {
  유네사: "border-l-[8px] border-l-red-500",
  토리이잉: "border-l-[8px] border-l-[#ffff00]",
  밤구대장: "border-l-[8px] border-l-purple-400",
  박츄바: "border-l-[8px] border-l-emerald-400",
  달뜬달: "border-l-[8px] border-l-pink-500",
  도남건랜스: "border-l-[8px] border-l-sky-400",
  충치가몇개냐뭐: "border-l-[8px] border-l-[#8B4513]",
  퍄퍗: "border-l-[8px] border-l-blue-600",
  Mccurter: "border-l-[8px] border-l-slate-200",
};

const ALIAS_TO_OWNER_KEY: Record<string, string> = {
  네사: "유네사", 토리: "토리이잉", 밤구: "밤구대장", 추바: "박츄바",
  무도: "달뜬달", 도남: "도남건랜스", 충치: "충치가몇개냐뭐", 퍄퍗: "퍄퍗", 까따: "Mccurter",
};

export function getOwnerBorderClass(owner?: string): string {
  if (!owner) return "border-l-[8px] border-l-slate-700";
  if (OWNER_COLORS[owner]) return OWNER_COLORS[owner];
  const alias = ALIAS_MAP[owner] || owner;
  const targetKey = ALIAS_TO_OWNER_KEY[alias] || alias;
  return OWNER_COLORS[targetKey] || "border-l-[8px] border-l-slate-700";
}

const ATTENDANCE_DOT_COLORS: Record<string, string> = {
  네사: "#FF0000", 토리: "#ffff00", 밤구: "#c084fc", 추바: "#34d399",
  무도: "#FF1493", 도남: "#38bdf8", 충치: "#8B4513", 퍄퍗: "#0066ff", 까따: "#FFFFFF",
};

export function getAttendanceColor(name: string): string {
  const mapped = ALIAS_MAP[name] || name;
  return ATTENDANCE_DOT_COLORS[mapped] || "#818cf8";
}

const BOARDING_OWNER_COLORS: Record<string, string> = {
  네사: "#ef4444", 토리: "#ffff00", 밤구: "#c084fc", 추바: "#34d399",
  무도: "#ec4899", 도남: "#38bdf8", 충치: "#b5a642", 퍄퍗: "#2563eb", 까따: "#fb923c",
};

export function getOwnerColor(owner: string): string {
  return BOARDING_OWNER_COLORS[ALIAS_MAP[owner] || owner] || "#818cf8";
}

// 서포터 직업 목록
export const SUPPORT_CLASSES = ["바드", "도화가", "홀리나이트", "발키리"];

// 직업 + 역할 -> 시너지 그룹 산출 (Code.gs getSynergy 포팅)
const SYNERGY_GROUPS: Record<Exclude<Synergy, "서폿" | "일반">, string[]> = {
  피증: ["소울이터", "브레이커", "소서리스", "데모닉", "슬레이어", "인파이터", "버서커", "가디언나이트"],
  방깍: ["서머너", "블래스터", "디스트로이어", "리퍼", "블레이드", "워로드", "환수사", "차원술사"],
  치피증: ["창술사", "발키리"],
  치적: ["배틀마스터", "아르카나", "스트라이커", "기상술사"],
  공증: ["스카우터", "기공사"],
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
  방깍: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  치피증: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
  치적: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  공증: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
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
