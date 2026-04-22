# Cloudflare Artfolio v1.1

추가 기능:
- 관리자 페이지에서 작가 소개 수정
- 관리자 페이지에서 문장형 수상 이력 수정
- 이메일 / 인스타그램 연락처 수정
- 공개 페이지 About 영역에 자동 반영

## 추가된 API
- `GET /api/profile`
- `GET /api/profile?admin=1`
- `POST /api/profile`

## 기존 DB에 이미 운영 중인 경우
이번 버전은 `site_profile` 테이블을 사용합니다.
다만 Functions가 첫 호출 때 `site_profile` 테이블을 자동 생성하므로, 보통 별도 마이그레이션 없이도 동작합니다.
안전하게 반영하려면 `schema.sql`의 아래 부분만 D1 콘솔에서 한 번 실행해도 됩니다.

```sql
CREATE TABLE IF NOT EXISTS site_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  artist_intro TEXT NOT NULL DEFAULT '',
  awards_text TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  contact_instagram TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO site_profile (id, artist_intro, awards_text, contact_email, contact_instagram, updated_at)
VALUES (1, '', '', '', '', CURRENT_TIMESTAMP);
```

## 반영 순서
1. GitHub 저장소에 파일 덮어쓰기
2. Cloudflare Pages 재배포 확인
3. `/admin.html` 접속
4. 관리자 키 입력
5. 작가 소개 / 문장형 수상 이력 저장
6. 공개 페이지 About 영역 확인
