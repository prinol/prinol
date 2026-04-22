# Cloudflare Artfolio v1

Cloudflare Pages + Pages Functions + R2 + D1 기반 업로드 관리형 포트폴리오 1차 버전이다.

## 포함 기능
- 공개 포트폴리오 갤러리
- 관리자 페이지(`/admin.html`)
- 이미지 업로드
- 작품 공개/비공개 전환
- 작품 삭제
- R2 이미지 저장
- D1 메타데이터 저장

## 1. GitHub 저장소에 올리기
이 폴더 전체를 GitHub 저장소 루트에 업로드한다.

## 2. Cloudflare Pages 프로젝트 생성
- Workers & Pages > Create > Pages
- Connect to Git
- 저장소 선택

빌드 설정:
- Framework preset: None
- Build command: 비워두기
- Build output directory: `/`

## 3. R2 버킷 생성
예시 이름:
- `prinol-art-bucket`

## 4. D1 데이터베이스 생성
예시 이름:
- `prinol-db`

`schema.sql` 내용을 실행해서 테이블을 만든다.

### 대시보드에서 SQL 실행
D1 > Console > `schema.sql` 붙여넣기 > Run

## 5. Pages에 바인딩 연결
Pages 프로젝트 > Settings > Bindings에서 아래를 추가한다.

### R2 binding
- Variable name: `ART_BUCKET`
- Bucket: 생성한 R2 버킷

### D1 binding
- Variable name: `DB`
- Database: 생성한 D1 DB

### Environment variable
- Variable name: `ADMIN_KEY`
- 값: 직접 정한 긴 비밀번호 문자열

예:
- `ADMIN_KEY = prinol-super-admin-2026`

## 6. 재배포
Bindings를 추가한 뒤 Pages 프로젝트를 다시 배포한다.

## 7. 사용 방법
### 공개 사이트
- `/` 접속
- 공개 작품만 표시됨

### 관리자
- `/admin.html` 접속
- `ADMIN_KEY`와 동일한 값을 입력하고 저장
- 작품 이미지와 정보를 업로드

## 현재 버전의 한계
- 관리자 인증은 단순 Bearer key 방식
- 이미지 수정 기능은 아직 없음
- Turnstile 미적용
- Cloudflare Access 미적용

## 다음 2차 버전 추천
- Cloudflare Access로 `/admin.html` 보호
- Turnstile 추가
- 작품 수정 기능 추가
- 썸네일 리사이즈/최적화
- 대표작 고정, 정렬 순서 제어

## 경로 구조
- `index.html`: 공개 포트폴리오
- `admin.html`: 관리자 화면
- `app.js`: 공개 갤러리 로직
- `admin.js`: 업로드/삭제/공개전환 로직
- `functions/api/*`: 서버 API
- `functions/images/[key].js`: R2 이미지 전달
- `schema.sql`: D1 테이블 생성 SQL

