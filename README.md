# ko-en-translate-ts-script
Scripts that go around folders, extract Korean characters, gather them into files, and change them to suit multiple languages

이 스크립트는
```
<div>안녕하세요</div>
```
혹은 
```
const greeting = "안녕하세요"
const tooltip = `도움을 보려면 클릭하세요`
```
등을 추출하여, 

output 폴더에 
```
"aFolder": {
  "bFolder": {
    "cComponent": {
      "line_8" : "안녕하세요"
    }
  }
}
```

처럼 만들어주는 스크립트 입니다.

input : 파일을 검색하며 한글을 추출할 경로의 최상위
output : 산출물들이 나올 경로

```
ts-node translate-script.ts
```
