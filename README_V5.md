# DACO 일본어 코치 v5.0 — 계정/클라우드 동기화

## 새 기능
- 아이디/비밀번호 회원가입 및 로그인
- PC/휴대폰 동일 계정 학습기록 자동 동기화
- 관리자 메뉴 (사용자 현황, 기록 백업, 기록 초기화, 계정 사용중지/재개)
- 초기 관리자: `admin / admin`
- 기존 v4.1 로컬 학습기록을 첫 로그인 시 계정으로 가져오기
- 오프라인 학습 후 온라인 복귀 시 자동 동기화

## 중요
GitHub Pages만으로는 여러 기기 간 기록을 공유할 수 없어 Supabase(Auth + Database)를 사용합니다.
`service_role` 키는 절대 GitHub에 올리지 마세요. 브라우저 앱에는 publishable/anon key만 사용합니다.

## 설정 순서
1. Supabase에서 새 Project 생성
2. Authentication > Providers > Email에서 **Confirm email 끄기**
3. SQL Editor에서 `supabase_setup.sql` 전체 실행
4. Project URL과 publishable/anon key를 `cloud-config.js`에 입력
5. GitHub에 전체 파일 Commit/Push
6. **다른 사용자보다 먼저** 앱 접속 → `아이디 만들기` → `관리자 초기 계정 만들기 (admin / admin)`
7. 로그인 후 설정에서 관리자 비밀번호 변경 권장

## GitHub에 올릴 파일
- index.html
- app.js
- cloud-auth.js
- cloud-config.js
- service-worker.js
- manifest.webmanifest
- icon-192.png
- icon-512.png

`supabase_setup.sql`은 GitHub에 올려도 비밀키가 없으므로 문제는 없지만, 앱 실행에는 필요하지 않습니다.
