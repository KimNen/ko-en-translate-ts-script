import fs from 'fs'
import path from 'path'
import ts from 'typescript'

const baseDir = 'input'
const outputFile = 'output'

type KoResult = {
    [key: string]: KoResult | string
}

const koResult: KoResult = {}
const excludeDirs = new Set(['node_modules', 'lib', 'apis', 'styles', 'utils', 'public', '.next'])

type Replacement = {
    keyPath: string
    pos: number
    end: number
    original: string
}

const walkDir = (dir: string, callback: (filePath: string) => void): void => {
    fs.readdirSync(dir).forEach((file) => {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
            const folderName = path.basename(fullPath)
            if (!excludeDirs.has(folderName)) {
                walkDir(fullPath, callback)
            }
        } else if (file.endsWith('.tsx')) {
            console.log('탐색 파일:', fullPath)
            callback(fullPath)
        }
    })
}

const containsKorean = (text: string): boolean => {
    return /[\uAC00-\uD7A3]/.test(text)
}

const buildKeyPath = (dirs: string[], fileName: string, line: number, index: number): string => {
    return [...dirs, fileName].join('.') + `.line_${line + 1}_${index + 1}`
}

const replaceKoreanInFile = (filePath: string, replacements: Replacement[]): void => {
    let content = fs.readFileSync(filePath, 'utf-8')
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

    const lineMap = new Map<number, { text: string; pos: number; end: number }[]>()
    const replacements: Replacement[] = []

    const addText = (text: string, pos: number, end: number) => {
        if (!containsKorean(text)) return
        const { line } = sourceFile.getLineAndCharacterOfPosition(pos)
        const lineTexts = lineMap.get(line) || []
        if (!lineTexts.some((item) => item.text === text && item.pos === pos)) {
            lineTexts.push({ text, pos, end })
            lineMap.set(line, lineTexts)
        }
    }

    const visit = (node: ts.Node): void => {
        if (ts.isJsxText(node)) {
            const raw = node.text.trim()
            if (raw) {
                const start = node.getStart(sourceFile)
                const end = node.getEnd()
                addText(raw, start, end)
            }
        }
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
            const raw = node.text.trim()
            if (raw) {
                const start = node.getStart(sourceFile) + 1
                const end = node.getEnd() - 1
                addText(raw, start, end)
            }
        }
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
            let cur: KoResult = koResult
            ;[...dirs, fileName].forEach((k) => {
                if (!cur[k]) cur[k] = {}
                cur = cur[k] as KoResult
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
