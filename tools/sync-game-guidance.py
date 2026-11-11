"""Validate or copy the versioned guidance package; does not commit or push."""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
BEGIN = "<!-- game-guidance:begin -->"
END = "<!-- game-guidance:end -->"
REPOS = {f"DEMO{n:03d}" for n in range(1, 8)}
PROTECTED = {"biu_art", "biu_client", "biu_design"}
EXCLUDED = {"node_modules", ".git", ".tmp", ".cache", ".local", "vendor", "third_party", "third-party", "migration", "archive", "reference", "snapshots", "library", "temp", "build", "dist"}


def git(root: Path, *args: str, input: bytes | None = None) -> bytes:
    return subprocess.run(["git", "-C", str(root), *args], input=input, capture_output=True, check=True).stdout


def validate_owner(root: Path) -> str:
    actual = Path(git(root, "rev-parse", "--show-toplevel").decode().strip()).resolve()
    if actual != root.resolve():
        raise ValueError("Target must be the actual Git root")
    remote = git(root, "config", "--get", "remote.origin.url").decode().strip()
    match = re.fullmatch(r"(?:https://github\.com/|git@github\.com:)zhao1234pan/([^/]+?)(?:\.git)?/?", remote, re.I)
    if not match or match.group(1) not in REPOS or any(p.lower() in PROTECTED for p in root.parts):
        raise ValueError("Target is outside the seven authorized personal repositories")
    return match.group(1)


def route_block(rel: str) -> str:
    prefix = "../" * len(PurePosixPath(rel).parent.parts)
    return f"""{BEGIN}
## 通用游戏制作 软著与发行规范

- 开始工作先读[根规范]({prefix}GAME_DEVELOPMENT.md)、[Git 范围]({prefix}GIT_WORKFLOW.md)和目标游戏当前约定；按任务再读玩法/UI、工程资源、软著、微信、TapTap 或验收分章。
- biu_art、biu_client、biu_design 由用户提交推送；确认属于 zhao1234pan 的个人仓库，由 Agent 验证后提交推送本任务改动并核对远端。当前任务的明确要求优先；下文历史 Git 授权或当时本地保留记录不覆盖当前范围。
- 保留用户与其他任务未提交、已暂存的内容。规范同步只改文档、读取入口和规范工具，不合并各分支玩法，不移动冻结标签，不默认取得平台办理或发布权限。
- 稳定的跨项目经验回收到 DEMO007 默认分支的通用规范，更新版本与来源后维护 DEMO001～007 所有现有分支；游戏特例保留在本游戏。
- 换电脑或分支后核对 GUIDANCE_MANIFEST.json，运行 python tools/sync-game-guidance.py --check。历史绝对路径仅供查证，不是新电脑依赖；自检、用户确认、真实手机及平台状态分别记录。
{END}"""


def normalize_git(text: str) -> str:
    lines = []
    for line in text.splitlines():
        if "每次完成改动并通过检查后必须提交 DEMO003 Git" in line:
            line = "个人仓库验证后由 Agent 按根 GIT_WORKFLOW.md 提交推送本任务改动；Biu 三工作仓库由用户提交推送。不沿用历史宽泛授权。"
        elif line.startswith("- 远程仓库必建（"):
            line = "- 操作前核对实际仓库与 origin；按根 GIT_WORKFLOW.md 区分 Biu 工作仓库与个人仓库。远端缺失或权限受阻如实报告，不把历史授权扩展到其他仓库。"
        elif "DEMO003 的配表和导出改动同样遵守下文的自动提交" in line:
            line = "DEMO003 配表、导出和配套实现按当前个人仓库规则执行；Biu 三工作仓库仍由用户提交推送。当前执行范围以根 GIT_WORKFLOW.md 为准。"
        elif re.search(r"所有仓库.*只修改本地.*(?:用户亲自|用户本人).*(?:提交|操作)", line):
            line = "- Git 按仓库归属执行：Biu 三工作仓库由用户提交推送；zhao1234pan 个人仓库由 Agent 验证后提交推送本任务改动。"
        lines.append(line)
    return "\n".join(lines).rstrip() + "\n"


def with_route(text: str, rel: str) -> str:
    text = normalize_git(text)
    block = route_block(rel)
    if BEGIN in text or END in text:
        if text.count(BEGIN) != 1 or text.count(END) != 1:
            raise ValueError(f"Malformed guidance markers: {rel}")
        return re.sub(re.escape(BEGIN) + r".*?" + re.escape(END), lambda _: block, text, flags=re.S).rstrip() + "\n"
    if text.startswith("# "):
        title, _, rest = text.partition("\n")
        return (title + "\n\n" + block + "\n\n" + rest.lstrip("\n")).rstrip() + "\n"
    return (block + "\n\n" + text).rstrip() + "\n"


def instruction_paths(paths: list[str]) -> list[str]:
    result = {"AGENTS.md"}
    for name in paths:
        p = PurePosixPath(name)
        if p.name in {"AGENTS.md", "AGENTS.override.md"} and not set(p.parts) & EXCLUDED:
            result.add(name)
        if len(p.parts) > 2 and p.parts[0] == "games" and p.parts[1] not in EXCLUDED:
            result.add("/".join(p.parts[:2]) + "/AGENTS.md")
    return sorted(result)


def read_payload(source: Path) -> tuple[dict, dict[str, bytes]]:
    manifest_path = source / "GUIDANCE_MANIFEST.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    payload = {}
    for name, expected in manifest["files"].items():
        p = PurePosixPath(name)
        if p.is_absolute() or ".." in p.parts or ".git" in p.parts:
            raise ValueError("Unsafe package path")
        allowed_root = name in {"GAME_DEVELOPMENT.md", "GIT_WORKFLOW.md"}
        allowed_tool = name in {"tools/sync-game-guidance.py", "tools/maintain-game-guidance.py"}
        allowed_document = p.parts[:2] == ("docs", "team") and "research" not in p.parts and p.suffix in {".md", ".json"}
        if not (allowed_root or allowed_tool or allowed_document):
            raise ValueError("Package attempts to modify a business file: " + name)
        data = (source / name).read_bytes()
        if hashlib.sha256(data).hexdigest() != expected:
            raise ValueError(f"Guidance digest mismatch: {name}")
        if name.endswith(".py"):
            ast.parse(data.decode("utf-8"), filename=name)
        payload[name] = data
    payload["GUIDANCE_MANIFEST.json"] = manifest_path.read_bytes()
    return manifest, payload


def validate_payload(payload: dict[str, bytes]) -> list[str]:
    errors = []
    for name, data in payload.items():
        text = data.decode("utf-8")
        if any(line.rstrip() != line for line in text.splitlines()):
            errors.append("Trailing whitespace: " + name)
        if not name.endswith(".md"):
            continue
        for link in re.findall(r"\[[^\]]+\]\(([^)]+)\)", text):
            link = link.strip("<>")
            if re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", link) or link.startswith("#"):
                continue
            target = os.path.normpath(str(PurePosixPath(name).parent / link.split("#", 1)[0])).replace("\\", "/")
            if target not in payload:
                errors.append(f"Broken package link: {name} -> {link}")
    return errors


def check_local(root: Path) -> dict:
    manifest, payload = read_payload(root)
    errors = validate_payload(payload)
    paths = git(root, "ls-files", "-z").decode("utf-8").rstrip("\0").split("\0")
    if (root / "games").is_dir():
        paths.extend(f"games/{p.name}/AGENTS.md" for p in (root / "games").iterdir() if p.is_dir())
    routes = instruction_paths(paths)
    for rel in routes:
        path = root / rel
        text = path.read_text(encoding="utf-8-sig") if path.exists() else ""
        if route_block(rel) not in text:
            errors.append("Missing or stale reading route: " + rel)
    return {"root": str(root), "version": manifest["version"], "package_files": len(payload), "reading_routes": len(routes), "errors": errors}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", type=Path)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.apply and args.check:
        parser.error("Choose --apply or --check")
    target = args.target.resolve() if args.target else ROOT
    validate_owner(target)
    if args.apply:
        _, payload = read_payload(ROOT)
        errors = validate_payload(payload)
        if errors:
            raise ValueError(str(errors))
        paths = git(target, "ls-files", "-z").decode("utf-8").rstrip("\0").split("\0")
        if (target / "games").is_dir():
            paths.extend(f"games/{p.name}/AGENTS.md" for p in (target / "games").iterdir() if p.is_dir())
        for name, data in payload.items():
            path = target / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        for rel in instruction_paths(paths):
            path = target / rel
            old = path.read_text(encoding="utf-8-sig") if path.exists() else ""
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(with_route(old, rel), encoding="utf-8", newline="\n")
    result = check_local(target)
    print(json.dumps(result, ensure_ascii=True))
    return int(bool(result["errors"]))


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
