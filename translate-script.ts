const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const baseDir = 'input_path'
const outputFile = 'output_path/x.json'

const koResult = {}
const excludeDirs = new Set(['node_modules', 'lib', 'apis', 'styles', 'utils', 'public', '.next'])

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach((file) => {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
            const folderName = path.basename(fullPath)
            if (!excludeDirs.has(folderName)) {
                walkDir(fullPath, callback)
            }
        } else if (file.endsWith('.tsx')) {
            console.log('탐색 파일:', fullPath) // 여기서 _document.tsx가 찍히는지 확인
            callback(fullPath)
        }
    })
}

// 한글 포함 여부 체크
function containsKorean(text) {
    return /[\uAC00-\uD7A3]/.test(text)
}

// 다국어 키 경로 생성
function buildKeyPath(dirs, fileName, line, index) {
    return [...dirs, fileName].join('.') + `.line_${line + 1}_${index + 1}`
}

// 실제 파일 내 텍스트 치환 함수
function replaceKoreanInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf-8')

    // 치환 위치 뒤에서 앞으로 정렬 (인덱스 밀림 방지)
    const sorted = [...replacements].sort((a, b) => b.pos - a.pos)

    for (const { keyPath, pos, end, original } of sorted) {
        const target = content.slice(pos, end)
        console.log(`치환 대상: "${target}" at [${pos}, ${end}) in ${filePath}`)

        content = content.slice(0, pos) + `{t("${keyPath}")}` + content.slice(end)
    }

    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`📄 치환 완료: ${filePath}`)
}

walkDir(baseDir, (filePath) => {
    const relPath = path.relative(baseDir, filePath)
    const dirs = path.dirname(relPath).split(path.sep).filter(Boolean)
    const fileName = path.basename(filePath, '.tsx')

    const content = fs.readFileSync(filePath, 'utf-8')
    const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
    )

    const lineMap = new Map()
    const replacements = []

    function addText(text, pos, end) {
        if (!containsKorean(text)) return
        const { line } = sourceFile.getLineAndCharacterOfPosition(pos)
        const lineTexts = lineMap.get(line) || []

        // 중복 방지 (텍스트+pos 기준)
        if (!lineTexts.some((item) => item.text === text && item.pos === pos)) {
            lineTexts.push({ text, pos, end })
            lineMap.set(line, lineTexts)
        }
    }

    function visit(node) {
        // JSX 텍스트
        if (ts.isJsxText(node)) {
            const raw = node.text.trim()
            if (raw) {
                const start = node.getStart(sourceFile)
                const end = node.getEnd()
                addText(raw, start, end)
            }
        }

        // 일반 문자열, 템플릿 리터럴(서브스티튜션 없는)
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
            const raw = node.text.trim()
            if (raw) {
                // 문자열의 내부 텍스트만 정확히 잡으려면 +1, -1
                const start = node.getStart(sourceFile) + 1
                const end = node.getEnd() - 1
                addText(raw, start, end)
            }
        }

        // JSX 속성값 문자열 처리 (alt="경고" 등)
        if (ts.isJsxAttribute(node)) {
            const initializer = node.initializer
            if (
                initializer &&
                (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer))
            ) {
                const raw = initializer.text.trim()
                if (raw) {
                    const start = initializer.getStart(sourceFile) + 1
                    const end = initializer.getEnd() - 1
                    addText(raw, start, end)
                }
            }
        }

        ts.forEachChild(node, visit)
    }

    visit(sourceFile)

    for (const [line, texts] of lineMap.entries()) {
        texts.forEach(({ text, pos, end }, i) => {
            const keyPath = buildKeyPath(dirs, fileName, line, i)
            replacements.push({ original: text, keyPath, pos, end })

            // ko.json에 저장
            let cur = koResult
            ;[...dirs, fileName].forEach((k) => {
                if (!cur[k]) cur[k] = {}
                cur = cur[k]
            })
            cur[`line_${line + 1}_${i + 1}`] = text
        })
    }

    if (replacements.length > 0) {
        replaceKoreanInFile(filePath, replacements)
    }
})

// ko.json 생성
if (!fs.existsSync(path.dirname(outputFile))) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true })
}
fs.writeFileSync(outputFile, JSON.stringify(koResult, null, 2), 'utf-8')
console.log('✅ 다국어 JSON 생성 및 대치 완료:', outputFile)
