# CLAUDE.md — 광운대 비전선포식 행사 현황

이 저장소는 행사 운영관리 담당자(구아린, 큐비크스)가 쓰는 **행사 운영 현황 웹페이지**입니다.
사용자는 한국어로 짧게 요청하고 빠르게 고쳐 가며 작업합니다. 선택지가 있으면 2~3개 제안하는 것을 좋아합니다.
UI 문구는 모두 한국어, "~해요" 체를 씁니다.

## 행사 개요
- 2027 로보페스트 월드 챔피언십 서울 성공 개최를 위한 광운 AI·로봇 미래교육 비전 선포식
- 2026.10.29(목) 14:00~18:00, 광운대학교 광운스퀘어(원형 광장). 사회 정다은 아나운서
- 1부: 개회 → 국민의례 → 내빈 소개 → 홍보영상 → 추진 경과(정석재 대외부총장) → 축사 7(현장 6 + 영상 1) → 비전 발표(총장) → 비전 영상 → 선포 세리머니(DEUX, CO2) → 기념촬영
- 2부: 행크 로저스 특별강연(영어, 한글 자막) → VR 드로잉 퍼포먼스(염동균) → 조코딩 강연·토크 → 체험존(16:30~17:30) → 폐회 17:40
- 기준 문서: 운영 시나리오 최종본(10/19)

## 구조
- `index.html`: 화면 전체. 원래 Claude 아티팩트로 만든 페이지라 `claude.use('db'|'assets'|'downloads'|'user')` API 를 그대로 씁니다.
- `supa-shim.js`: 위 API 를 Supabase 로 구현한 어댑터. 화면 코드를 고칠 때 이 API 모양(Firestore 비슷)을 유지하세요.
  - `db.collection(t).orderBy('o').onSnapshot(cb)`, `db.collection(t).add(d)`
  - `db.doc('t/id').update(patch)` → RPC `patch_doc` (data jsonb 최상위 병합), `.set(d)` → upsert, `.delete()`
  - `assets.upload(file)` → Storage 버킷 `files`, 반환 `{id}` = 파일 이름
  - `BLOB(id)`: 파일 주소. `files/…` 로 시작하면 저장소의 정적 파일, 아니면 Supabase Storage
  - 편집 버튼 표시 여부는 `ED()` (= 편집자로 로그인했는지)
- 외부 라이브러리: supabase-js(jsdelivr), html2canvas·jsPDF(cdnjs, PDF 버튼 누를 때만 로드)

## 데이터 (Supabase)
테이블 `items`, `vj`, `meta` 는 모두 `(id text, o float, data jsonb)`. 화면은 `{id, ...data}` 로 씁니다.

`items.data`
- 공통: `kind`(design|rent|buy|staff), `cat`, `name`, `qty`, `loc`, `note`, `code`, `st`, `o`
- 상태 `st`: design 0미착수 1디자인완료 2출력발주 3설치완료 / rent 0미발주 1발주완료 2입고완료 / buy 0미구매 1주문완료 2입고완료 / staff 0미배정 1배정완료 2당일확인
- `pins`: `[{x,y,l}]` 도면 좌표 (plaza.jpg 1672×941 픽셀 기준), `l` 비우면 자동 라벨
- 인력: `who`, `sex`(남/여) / 디자인: `imgs`, `vendor`, `vlink`
- 대여·구매: `price`, `pq`, `pn`, `shipFee`, `shipFree`(이 금액 이상이면 배송비 0), `shipNote`, `link`, `ops`(운영텐트 보관 묶음)
- 구매: `rcpts` `[{id,name,type}]` 영수증 / 대여 영수증은 `meta` 의 `rent` 문서 `{rcpts:[…]}` 하나로 묶음

`vj.data`: `no,s,e,item,desc,cast,mat,music,pa,ledL,ledC,ledR,live,rem`, `scr:[{l,img,link}]`

권한: 읽기는 누구나, 쓰기는 `editors` 테이블에 있는 이메일로 로그인한 사람만 (RLS + `is_editor()`).
로그인은 메일 링크가 아니라 공용 편집 계정(`EDIT_EMAIL`, config.js) + 편집 비밀번호 방식입니다. 화면에는 비밀번호 칸만 있어요.

## 데이터 고치는 방법
- 화면에서 고치는 게 기본입니다.
- 한꺼번에 고칠 때는 SQL 을 만들어 사용자에게 주고 Supabase SQL Editor 에서 실행하게 하세요.
  예: `update items set data = data || '{"price":12000,"pq":20}'::jsonb where id='r12';`
- service_role key, DB 비밀번호는 저장소에 절대 커밋하지 않습니다(.env 는 .gitignore).

## 확정된 사항 (바꾸기 전 사용자 확인)
- 의자 480 / 몽골텐트 5×5 체험 4·콘솔 2 / 3×3 몽골 1(운영) / 캐노피 3×6 1(창고)·3×3 2(대기) / 모래주머니 165 / 스태프 티 30 / 텐트 현수막 3
- 리셉션: 듀라 4, 의자 4, 물통 4, 전시단 3(구매), 실내 X배너 2, 현수막 1(단색)
- 실내 X배너: 리셉션 XR 2, 주차장 XB2·XB3 4(지하 2·3층 각 2)
- 울트라배너 U1~U6 한 디자인, U7~U8 한 디자인 / X배너 X1~X10 / 큐카드는 한 디자인 6부(사회자·키노트·경과보고 각 2)
- 분전반: ① 운영텐트 뒤 80kW, ② 콘솔 텐트 뒤 25kW (체험부스 4동 2kW 는 콘솔 쪽)
- 무전기 12: 큐비크스 4(K1·K2·K3·K5) + 알바 7(S1·S7·S2·S6·O1·O3·S3) + 예비 1
- 대여 단가는 대여 업체 견적서 기준, 수량은 현재 수량 적용

## 작업 습관
- 큰 변경 전후로 화면을 실제로 열어 확인 (로그인 안 한 상태 = 보기 전용, 편집자 로그인 상태 둘 다)
- 인쇄용 PDF 는 A4 가로, 큰 글씨(현장 이사님 가독성), 인력→디자인(시안 카드)→대여→구매 순서
