# YOMIAN JAPANESE v6.11.4

- Chrome/Android에서 삭제 후에도 `이미 설치됨`으로 남는 경우를 위한 재설치 복구 페이지 추가
- 메인 manifest에 기존 정체성을 유지하는 명시적 `id: ./` 추가
- `reinstall.html` + `manifest-reinstall.webmanifest`는 별도 복구용 App ID 사용
- 잘못된 `about://webapks` 안내 제거
- 일반 사용자의 기존 학습/로그인/Supabase 데이터에는 영향 없음

복구 URL: `./reinstall.html`
