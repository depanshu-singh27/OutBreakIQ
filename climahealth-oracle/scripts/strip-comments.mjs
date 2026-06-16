import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const oracleRoot = path.join(__dirname, '..')
const capstoneRoot = path.join(oracleRoot, '..')

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, exts, out)
    else if (exts.some((e) => p.endsWith(e))) out.push(p)
  }
  return out
}

function scriptKindFor(fp) {
  if (fp.endsWith('.tsx')) return ts.ScriptKind.TSX
  if (fp.endsWith('.ts')) return ts.ScriptKind.TS
  return ts.ScriptKind.JS
}

function stripFile(fp) {
  const source = fs.readFileSync(fp, 'utf8')
  const kind = scriptKindFor(fp)
  const sf = ts.createSourceFile(fp, source, ts.ScriptTarget.Latest, true, kind)
  const printer = ts.createPrinter({
    removeComments: true,
    newLine: ts.NewLineKind.LineFeed,
  })
  let out = printer.printFile(sf)
  if (source.charCodeAt(0) === 0xfeff) out = '\ufeff' + out
  fs.writeFileSync(fp, out, 'utf8')
}

const files = [
  ...walk(path.join(oracleRoot, 'src'), ['.ts', '.tsx']),
  path.join(oracleRoot, 'vite.config.ts'),
  path.join(oracleRoot, 'scripts', 'patch-dominant-disease.cjs'),
  path.join(capstoneRoot, 'cha-dev-api', 'server.mjs'),
].filter((f) => fs.existsSync(f))

for (const fp of files) {
  stripFile(fp)
  console.log('stripped', path.relative(capstoneRoot, fp))
}
