-- lopec 점수/인게임 점수 컬럼을 "길드원이 직접 입력하는 전투력" 하나로 정리
-- (공식 API엔 전투력 수치가 없어서, 유저가 게임 화면 보고 직접 입력하는 방식으로 결정함)

alter table public.characters rename column lopec_score to combat_power;
alter table public.characters drop column ingame_score;
