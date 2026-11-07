# ANTHONY 日本語 COACH v6.1

## v6.0 포함 기능
- Anthony 브랜딩
- 점수제 / 전체 랭킹
- 출석체크 / 마이페이지
- 오후 7시 미학습 Web Push 클라이언트

## v6.1 추가
- 생활용어 299개 초기 탑재, JLPT 급수 제한 없이 계속 확장 가능한 구조
- 조사 표현 28개 사전 + 빈칸 퀴즈
- 위치 표현 16개 SVG 그림 카드 + 그림 퀴즈
- 날짜/월/요일/시간/돈/조수사 학습 + 퀴즈
- 편의점·식당·카페·쇼핑·전철·택시·호텔·공항·길찾기·회사·전화·곤란상황 등 12개 상황 연계 공간
- 실생활 훈련도 클라우드 state에 저장되고 랭킹 점수에 반영

## 업데이트
1. GitHub 패치 파일을 저장소 루트에 덮어쓰기 후 Commit/Push
2. v6 DB 마이그레이션을 아직 안 했다면 `supabase_v6_migration.sql`을 Supabase SQL Editor에서 1회 실행
3. 오후 7시 푸시는 `ANTHONY_Japanese_Coach_v6_Push_Setup.zip`의 안내에 따라 Edge Function/Cron 1회 설정
