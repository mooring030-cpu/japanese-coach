# YOMIAN ENGLISH PWA ID FIX

영어 앱 저장소 `anthony-english-coach`의 `manifest.webmanifest`에서 다음 3개를 명시하세요.

```json
"id": "/anthony-english-coach/",
"start_url": "/anthony-english-coach/",
"scope": "/anthony-english-coach/"
```

`id: "./"`를 사용하면 YOMIAN JAPANESE와 같은 origin(`mooring030-cpu.github.io`)에서 충돌할 수 있습니다.
서비스워커는 영어 저장소 내부 `./service-worker.js`로 등록하고 cache name도 `yomian-english-*`처럼 일본어와 분리하세요.
