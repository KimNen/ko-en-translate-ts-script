# TypeScript 한글 추출 및 다국어 자동화 스크립트

## 개요

이 스크립트는 **React/TypeScript(.tsx)** 파일 내의 한글 텍스트(UI 텍스트)를 자동으로 추출하고,  
추출된 한글을 다국어 JSON 파일(예: `ko.json`)로 저장하며,  
기존 한글 텍스트를 `{t("key")}` 형태의 다국어 함수 호출로 자동 대체합니다.

`next-translate` 라이브러리와 연계하여 실제 서비스에 바로 적용할 수 있도록 설계되었습니다.

---

## 주요 기능

- **디렉토리 재귀 탐색**  
  `input` 디렉토리 하위의 모든 `.tsx` 파일에서 한글 텍스트를 자동 탐색합니다.  
  (`node_modules`, `lib`, `apis` 등 일부 폴더는 자동 제외)

- **한글 텍스트 추출**  
  JSX 내의 한글, 문자열 리터럴, JSX 속성(prop) 내 한글까지 모두 탐지하여 추출

- **다국어 JSON(`ko.json`) 자동 생성**  
  파일 구조와 라인 정보를 기반으로 중복되지 않는 키를 생성하여 한글-키 매핑을 만듭니다.

- **코드 내 한글 자동 대체**  
  추출된 한글 텍스트를 `{t("key")}` 호출로 자동 치환하여,  
  다국어화 작업이 일관되고 빠르게 이루어집니다.

- **next-translate 연동**  
  생성된 JSON 파일을 `next-translate`의 locale 리소스로 사용하면  
  바로 다국어 서비스가 가능합니다.


## 사용법

1. **설치**

   ```bash
   npm install typescript
   ```

2. **스크립트 실행**

  예시:
  input 폴더 내의 .tsx 파일을 모두 탐색,
  한글을 추출해 output 파일(JSON)로 저장하고,
  각 파일 내 한글을 {t("key")}로 치환
  ```
  ts-node translate-script.ts
  ```
  (baseDir와 outputFile 경로는 코드 상단에서 직접 지정합니다.)

  생성 결과 예시

  기존 코드
  ```
  <div>안녕하세요</div> <Button label="저장" />
  ```
  스크립트 실행 후
  ```
  <div>{t("components.Home.line_1_1")}</div> <Button label={t("components.Home.line_2_1")} />
  ```
  생성된 ko.json
  ```
  {
  "components": {
    "Home": {
        "line_1_1": "안녕하세요",
        "line_2_1": "저장"
      }
    }
  }
  ```
3. **next-translate 연동**

  output 경로에 생성된 ko.json을
  locales/ko/common.json 등으로 이동 후
  next-translate의 다국어 리소스로 활용합니다.
  
  실제 UI에서 `t("components.Home.line_1_1")` 형태로
  한글이 자동 적용됩니다. 

4. **참고 및 주의사항**
  치환 범위: JSX Text, prop(string), 템플릿 리터럴 모두 대응
  
  라인별 고유 키: 파일 경로, 라인번호, 인덱스 기반 키 생성 (충돌 최소화)
  
  수동 관리 필요: 치환 후 일부 레이아웃이나 스타일이 깨질 수 있으니,
  대체 결과를 반드시 확인해야 합니다.
  
  백업 필수: 스크립트 실행 전 소스코드 백업을 권장합니다.
  
  문의 및 개선
  예외 케이스, 새로운 요구사항, 버그 발생 시 언제든 피드백 주세요!
  
  추가 언어나 더 많은 자동화가 필요하면 확장 가능합니다.
