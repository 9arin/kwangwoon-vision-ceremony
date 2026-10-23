# 비전선포식 행사 현황

2027 로보페스트 월드 챔피언십 서울 성공 개최를 위한 **광운 AI·로봇 미래교육 비전 선포식**
(2026.10.29(목) 광운대 광운스퀘어) 운영 현황 페이지입니다.

인력 · 디자인 · 대여 · 구매 · VJ 를 한 화면에서 보고, 도면 위 위치 확인, 상태 변경, 시안/영수증 업로드, 인쇄용 PDF 저장을 할 수 있습니다.

- 화면: GitHub Pages (이 저장소의 `index.html`)
- 데이터·파일·로그인: Supabase

## 처음 한 번 설정

1. **Supabase 테이블 만들기**
   Supabase 대시보드 → SQL Editor → `supabase/01_schema.sql` 내용을 붙여 넣고 Run.
   마지막 줄의 편집자 이메일 목록을 필요에 맞게 고치세요.
2. **기존 데이터 넣기**
   같은 곳에서 `supabase/02_seed.sql` 을 붙여 넣고 Run.
3. **로그인 주소 등록**
   Authentication → URL Configuration → Site URL 과 Redirect URLs 에 GitHub Pages 주소
   (예: `https://계정이름.github.io/저장소이름/`) 를 넣으세요.
4. **연결 정보 넣기**
   Project Settings → API 의 Project URL 과 anon public key 를 `config.js` 에 넣고 커밋.
   (anon key 는 공개용입니다. service_role key 와 DB 비밀번호는 절대 넣지 마세요.)
5. **GitHub Pages 켜기**
   저장소 Settings → Pages → Source: `Deploy from a branch`, Branch: `main` / `/ (root)` → Save.
   1~2분 뒤 `https://계정이름.github.io/저장소이름/` 에서 열립니다.

## 사용

- 누구나 링크로 볼 수 있습니다.
- 수정은 **편집자 명단(editors 테이블)** 에 있는 이메일로 로그인한 사람만 됩니다.
  페이지 위쪽에 이메일을 넣으면 로그인 링크가 메일로 옵니다.
- 편집자 추가: SQL Editor 에서
  `insert into public.editors (email) values ('새이메일@example.com');`

## 폴더 구조

| 경로 | 내용 |
|---|---|
| `index.html` | 화면 전체 (HTML·CSS·JS 한 파일) |
| `supa-shim.js` | 화면 코드가 쓰는 `claude.use('db'…)` API 를 Supabase 로 연결하는 어댑터 |
| `config.js` | Supabase 주소·공개 키 |
| `plaza.jpg` | 광운스퀘어 조감도 (도면, 1672×941) |
| `files/` | 이전 페이지에서 옮긴 디자인 시안 이미지 |
| `supabase/01_schema.sql` | 테이블·권한·저장소 설정 |
| `supabase/02_seed.sql` | 10/23 기준 데이터 |
| `CLAUDE.md` | Claude Code 작업 안내 |

## 알려진 차이 (Claude 아티팩트 버전과 비교)

- 구매 '가격 가져오기' 버튼은 Claude 데스크톱 앱 전용이라 없습니다. 가격은 '가격 수정' 으로 넣습니다.
