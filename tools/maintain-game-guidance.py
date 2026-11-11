"""Audit or publish guidance-only commits to all DEMO001-007 branches."""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("game_guidance_sync", ROOT / "tools/sync-game-guidance.py")
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)
_BLOBS = {}
_WRITTEN = set()


def object_id(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()


def run(repo: Path, *args: str, input: bytes | None = None, env: dict | None = None, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "--git-dir", str(repo), *args], input=input, env=env, capture_output=True, check=check)


def heads(repo: Path) -> dict[str, str]:
    result = run(repo, "ls-remote", "--heads", "origin").stdout.decode()
    return {line.split()[1].removeprefix("refs/heads/"): line.split()[0] for line in result.splitlines()}


def fetch(repo: Path) -> dict[str, str]:
    run(repo, "fetch", "--filter=blob:none", "--no-tags", "origin", "+refs/heads/*:refs/remotes/origin/*")
    return heads(repo)


def tree_entries(repo: Path, sha: str) -> dict[str, tuple[str, str]]:
    result = {}
    for item in run(repo, "ls-tree", "-r", "-z", sha).stdout.split(b"\0"):
        if not item:
            continue
        metadata, name = item.split(b"\t", 1)
        mode, kind, oid = metadata.decode().split()
        if kind == "blob":
            result[name.decode("utf-8")] = (mode, oid)
    return result


def blob(repo: Path, oid: str) -> bytes:
    key = (str(repo), oid)
    if key not in _BLOBS:
        _BLOBS[key] = run(repo, "cat-file", "blob", oid).stdout
    return _BLOBS[key]


def desired_files(repo: Path, base: str, payload: dict[str, bytes]) -> tuple[dict, dict]:
    entries = tree_entries(repo, base)
    desired = dict(payload)
    for name in sync.instruction_paths(list(entries)):
        entry = entries.get(name)
        if entry and entry[0] != "100644" and entry[0] != "100755":
            raise ValueError("Refuse non-regular instruction file: " + name)
        old = blob(repo, entry[1]).decode("utf-8-sig") if entry else ""
        desired[name] = sync.with_route(old, name).encode("utf-8")
    for name, entry in entries.items():
        if name.endswith("DEVELOPMENT_WORKFLOW.md") and not set(Path(name).parts) & sync.EXCLUDED:
            desired[name] = sync.with_route(blob(repo, entry[1]).decode("utf-8-sig"), name).encode("utf-8")
    if "README.md" in entries:
        name = "README.md"
        old = blob(repo, entries[name][1]).decode("utf-8-sig")
        begin, end = "<!-- game-guidance-readme:begin -->", "<!-- game-guidance-readme:end -->"
        block = begin + "\n## 游戏制作与发行规范\n\n统一入口：[GAME_DEVELOPMENT.md](GAME_DEVELOPMENT.md)。玩法/UI、工程资源、软著、微信、TapTap 与验收按任务分章读取；Git 范围见 [GIT_WORKFLOW.md](GIT_WORKFLOW.md)。版本与文件摘要见 GUIDANCE_MANIFEST.json。\n" + end
        if begin in old and end in old:
            start, stop = old.index(begin), old.index(end) + len(end)
            updated = old[:start] + block + old[stop:]
        else:
            title, _, rest = old.partition("\n")
            updated = title + "\n\n" + block + "\n\n" + rest.lstrip("\n")
        desired[name] = updated.encode("utf-8")
    return entries, desired


def make_commit(repo: Path, branch: str, base: str, payload: dict, cache: Path) -> tuple[str, list[str]]:
    entries, desired = desired_files(repo, base, payload)
    changes = {}
    for name, data in desired.items():
        oid = object_id(data)
        if name not in entries or entries[name][1] != oid:
            key = (str(repo), oid)
            if key not in _WRITTEN:
                written = run(repo, "hash-object", "-w", "--stdin", input=data).stdout.decode().strip()
                if written != oid:
                    raise ValueError("Unsupported Git object format")
                _WRITTEN.add(key)
            changes[name] = (entries.get(name, ("100644", ""))[0], oid)
    if not changes:
        return base, []
    index = cache / ("index-" + hashlib.sha256((str(repo) + branch).encode()).hexdigest())
    env = dict(os.environ, GIT_INDEX_FILE=str(index))
    run(repo, "read-tree", base, env=env)
    info = b"".join(f"{mode} {oid}\t{name}".encode("utf-8") + b"\0" for name, (mode, oid) in changes.items())
    run(repo, "update-index", "-z", "--index-info", input=info, env=env)
    check = run(repo, "diff", "--cached", "--check", base, env=env, check=False)
    if check.returncode:
        raise ValueError(check.stdout.decode("utf-8", errors="replace"))
    # Existing business blobs may be intentionally absent in a filtered cache.
    tree = run(repo, "write-tree", "--missing-ok", env=env).stdout.decode().strip()
    actual = set(run(repo, "diff-tree", "--no-commit-id", "--name-only", "-r", "-z", base, tree).stdout.decode("utf-8").rstrip("\0").split("\0"))
    if actual != set(changes):
        raise ValueError("Unexpected non-guidance tree changes")
    message = "docs: 统一游戏制作软著与发行经验规范\n\n仅同步通用规范、读取入口与规范工具，保留本分支业务内容和冻结标签。\n"
    sha = run(repo, "commit-tree", tree, "-p", base, input=message.encode("utf-8")).stdout.decode().strip()
    return sha, sorted(changes)


def local_heads(paths: list[Path], name: str, repo: Path) -> dict[str, str]:
    result = {}
    for path in paths:
        if sync.validate_owner(path) != name:
            continue
        refs = sync.git(path, "for-each-ref", "--format=%(refname:strip=2) %(objectname)", "refs/heads").decode().splitlines()
        for line in refs:
            branch, sha = line.split()
            if run(repo, "cat-file", "-e", sha + "^{commit}", check=False).returncode:
                fetched = run(repo, "fetch", "--filter=blob:none", "--no-tags", "origin", sha, check=False)
                if fetched.returncode:
                    raise ValueError("Local commit is not available in the remote cache: " + branch)
            result[branch] = sha
    return result


def maintain(name: str, source: Path, cache: Path, payload: dict, publish: bool, local_paths: list[Path]) -> dict:
    repo = cache / (name + ".git")
    url = "https://github.com/zhao1234pan/" + name + ".git"
    if not repo.exists():
        subprocess.run(["git", "clone", "--bare", "--filter=blob:none", url, str(repo)], capture_output=True, check=True)
    if run(repo, "config", "--get", "remote.origin.url").stdout.decode().strip() != url:
        raise ValueError("Unexpected cache origin: " + name)
    full_payload = dict(payload)
    if name == "DEMO007" and (source / "docs/team/research").is_dir():
        for path in sorted((source / "docs/team/research").rglob("*")):
            if path.is_file() and path.suffix in {".md", ".json"}:
                full_payload[path.relative_to(source).as_posix()] = path.read_bytes()
    for attempt in range(4):
        remote = fetch(repo)
        local = local_heads(local_paths, name, repo)
        selected = dict(remote)
        for branch, sha in local.items():
            old = remote.get(branch)
            if not old or old == sha or run(repo, "merge-base", "--is-ancestor", old, sha, check=False).returncode == 0:
                selected[branch] = sha
            elif run(repo, "merge-base", "--is-ancestor", sha, old, check=False).returncode:
                raise ValueError("Diverged local and remote branch requires separate review: " + name + "/" + branch)
        result = {};updates = {}
        for branch, base in sorted(selected.items()):
            sha, changes = make_commit(repo, branch, base, full_payload, cache)
            result[branch] = {"base": base, "commit": sha, "changed_files": changes, "remote_existed": branch in remote}
            if changes or branch not in remote or sha != remote.get(branch):
                updates[branch] = sha
        if not publish:
            return {"repository": name, "branches": result, "planned_updates": len(updates), "published": False}
        if updates:
            refs = [sha + ":refs/heads/" + branch for branch, sha in updates.items()]
            pushed = run(repo, "push", "--porcelain", "--atomic", "origin", *refs, check=False)
            if pushed.returncode:
                if attempt < 3:
                    continue
                raise ValueError(pushed.stderr.decode("utf-8", errors="replace")[-2000:])
        latest = heads(repo)
        if set(latest) - set(selected):
            continue
        if any(latest.get(branch) != record["commit"] for branch, record in result.items()):
            continue
        for branch, record in result.items():
            record["remote_verified"] = latest[branch]
            # Verify the exact committed guidance bytes and every managed reading route.
            entries, desired = desired_files(repo, latest[branch], full_payload)
            for path, data in desired.items():
                expected = object_id(data)
                if path not in entries or entries[path][1] != expected:
                    raise ValueError("Committed guidance validation failed: " + name + "/" + branch + "/" + path)
        return {"repository": name, "branches": result, "published": True, "verified_branch_count": len(result)}
    raise ValueError("Branches kept changing; rerun to reconcile current tips: " + name)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--publish-all", action="store_true")
    parser.add_argument("--repository", action="append", choices=sorted(sync.REPOS))
    parser.add_argument("--include-local", action="append", type=Path, default=[])
    args = parser.parse_args()
    source, cache = args.source.resolve(), args.cache.resolve()
    if source == cache or source in cache.parents:
        raise ValueError("Keep cache separate from the guidance source directory")
    cache.mkdir(parents=True, exist_ok=True)
    manifest, payload = sync.read_payload(source)
    errors = sync.validate_payload(payload)
    if errors:
        raise ValueError(str(errors))
    results = []
    for name in args.repository or sorted(sync.REPOS):
        result = maintain(name, source, cache, payload, args.publish_all, [p.resolve() for p in args.include_local])
        results.append(result)
        (cache / "guidance-maintenance-results.json").write_text(json.dumps({"version": manifest["version"], "repositories": results}, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps({"repository": name, "branches": len(result["branches"]), "published": result["published"], "planned_updates": result.get("planned_updates")}, ensure_ascii=True), flush=True)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
