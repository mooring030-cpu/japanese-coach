# YOMIAN JAPANESE v6.11.5

## PWA identity collision fix

PC/Android에서 YOMIAN JAPANESE를 실행했는데 YOMIAN ENGLISH가 열리는 문제를 수정했습니다.

원인: 두 앱의 manifest에 `id: "./"`가 들어가 같은 github.io origin에서 동일 App ID로 해석됨.

수정:
- Japanese main id: `/japanese-coach/`
- Japanese start_url/scope: `/japanese-coach/`
- Recovery id: `/japanese-coach-recovery-v2/`
- Service worker cache: v6.11.5

영어 앱도 반드시 다음처럼 수정해야 합니다.
- English main id: `/anthony-english-coach/`
- English start_url/scope: `/anthony-english-coach/`

기존 로그인/학습 데이터 구조는 변경하지 않습니다.
