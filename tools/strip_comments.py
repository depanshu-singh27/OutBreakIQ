from __future__ import annotations

import ast
import io
import re
import tokenize
from pathlib import Path


def line_offsets(source: str) -> list[int]:
    off = [0]
    pos = 0
    for line in source.splitlines(keepends=True):
        pos += len(line)
        off.append(pos)
    return off


def to_offset(line: int, col: int, offs: list[int]) -> int:
    if line < 1:
        return 0
    if line > len(offs) - 1:
        return offs[-1]
    return offs[line - 1] + col


def _stmt_is_docstring(stmt: ast.stmt) -> bool:
    if not isinstance(stmt, ast.Expr):
        return False
    v = stmt.value
    return isinstance(v, ast.Constant) and isinstance(v.value, str)


def _future_skip_index(body: list[ast.stmt]) -> int:
    i = 0
    while i < len(body):
        st = body[i]
        if isinstance(st, ast.ImportFrom) and st.module == "__future__":
            i += 1
            continue
        break
    return i


def docstring_intervals(source: str) -> list[tuple[int, int]]:
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return []

    offs = line_offsets(source)
    intervals: list[tuple[int, int]] = []

    def add_body_docstrings(body: list[ast.stmt]) -> None:
        if not body:
            return
        i = _future_skip_index(body)
        if i < len(body) and _stmt_is_docstring(body[i]):
            stmt = body[i]
            lo = to_offset(stmt.lineno, stmt.col_offset, offs)
            el = getattr(stmt, "end_lineno", None)
            ec = getattr(stmt, "end_col_offset", None)
            if el is not None and ec is not None:
                hi = to_offset(el, ec, offs)
            else:
                seg = ast.get_source_segment(source, stmt)
                hi = lo + len(seg or "")
            intervals.append((lo, hi))

    add_body_docstrings(tree.body)

    class V(ast.NodeVisitor):
        def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
            add_body_docstrings(node.body)
            self.generic_visit(node)

        def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
            add_body_docstrings(node.body)
            self.generic_visit(node)

        def visit_ClassDef(self, node: ast.ClassDef) -> None:
            add_body_docstrings(node.body)
            self.generic_visit(node)

    V().visit(tree)
    return intervals


def comment_intervals(source: str) -> list[tuple[int, int]]:
    offs = line_offsets(source)
    intervals: list[tuple[int, int]] = []
    types = [tokenize.COMMENT]
    tc = getattr(tokenize, "TYPE_COMMENT", None)
    if tc is not None:
        types.append(tc)
    readline = io.StringIO(source).readline
    try:
        for t in tokenize.generate_tokens(readline):
            if t.type in types:
                sline, scol = t.start
                eline, ecol = t.end
                intervals.append(
                    (to_offset(sline, scol, offs), to_offset(eline, ecol, offs))
                )
    except tokenize.TokenError:
        pass
    return intervals


def merge_intervals(ivs: list[tuple[int, int]]) -> list[tuple[int, int]]:
    if not ivs:
        return []
    ivs = sorted(ivs)
    out: list[list[int]] = [list(ivs[0])]
    for lo, hi in ivs[1:]:
        if lo <= out[-1][1]:
            out[-1][1] = max(out[-1][1], hi)
        else:
            out.append([lo, hi])
    return [(a, b) for a, b in out]


def strip_python(source: str) -> str:
    ivs = merge_intervals(docstring_intervals(source) + comment_intervals(source))
    if not ivs:
        return source
    parts: list[str] = []
    cursor = 0
    for lo, hi in ivs:
        parts.append(source[cursor:lo])
        cursor = hi
    parts.append(source[cursor:])
    out = "".join(parts)
    out = re.sub(r"\n{4,}", "\n\n\n", out)
    return out


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    for path in sorted((root / "ml_model").glob("*.py")):
        if path.name == "strip_comments.py":
            continue
        text = path.read_text(encoding="utf-8")
        stripped = strip_python(text)
        if stripped == text:
            continue
        try:
            compile(stripped, str(path), "exec")
        except SyntaxError as e:
            print("skip (syntax error after strip):", path.relative_to(root), e)
            continue
        path.write_text(stripped, encoding="utf-8", newline="\n")
        print("stripped", path.relative_to(root))


if __name__ == "__main__":
    main()
