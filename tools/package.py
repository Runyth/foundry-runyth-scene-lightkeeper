#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((ROOT / "module/module.json").read_text(encoding="utf-8"))
PACKAGE = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
VERSION = MANIFEST["version"]
if PACKAGE["version"] != VERSION:
  raise RuntimeError(f"Version mismatch: module.json={VERSION}, package.json={PACKAGE['version']}")

OUTPUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "dist"
RUNTIME = ROOT / "module"
DOCUMENTATION_ROOT = f"runyth-scene-lightkeeper-v{VERSION}-doc"
FIXED = (2026, 8, 5, 12, 0, 0)
SOURCE_EXCLUDES = {"dist", ".git", "node_modules", "__pycache__"}


def zip_info(target: str, *, directory: bool = False) -> zipfile.ZipInfo:
  normalized = target.rstrip("/") + ("/" if directory else "")
  info = zipfile.ZipInfo(normalized, FIXED)
  info.compress_type = zipfile.ZIP_STORED if directory else zipfile.ZIP_DEFLATED
  info.external_attr = (0o40755 if directory else 0o100644) << 16
  return info


def add_file(archive: zipfile.ZipFile, source: Path, target: str) -> None:
  archive.writestr(
    zip_info(target),
    source.read_bytes(),
    compress_type=zipfile.ZIP_DEFLATED,
    compresslevel=9
  )


def add_tree(archive: zipfile.ZipFile, source: Path, archive_root: str, excludes: set[str] | None = None) -> None:
  excludes = excludes or set()
  for path in sorted(source.rglob("*")):
    relative = path.relative_to(source)
    if any(part in excludes for part in relative.parts):
      continue
    target = f"{archive_root}/{relative.as_posix()}"
    if path.is_dir():
      archive.writestr(zip_info(target, directory=True), b"")
      continue
    add_file(archive, path, target)


def sha256(path: Path) -> str:
  digest = hashlib.sha256()
  with path.open("rb") as stream:
    for chunk in iter(lambda: stream.read(1024 * 1024), b""):
      digest.update(chunk)
  return digest.hexdigest()


def create_documentation_archive(path: Path) -> None:
  with zipfile.ZipFile(path, "w") as archive:
    for name in ("README.md", "CHANGELOG.md", "LICENSE", "package.json"):
      add_file(archive, ROOT / name, f"{DOCUMENTATION_ROOT}/{name}")
    add_file(archive, ROOT / "module/module.json", f"{DOCUMENTATION_ROOT}/module.json")
    add_tree(archive, ROOT / "docs", f"{DOCUMENTATION_ROOT}/docs")


def main() -> None:
  OUTPUT.mkdir(parents=True, exist_ok=True)
  install = OUTPUT / f"runyth-scene-lightkeeper-v{VERSION}-mod.zip"
  source = OUTPUT / f"runyth-scene-lightkeeper-v{VERSION}-src.zip"
  documentation = OUTPUT / f"runyth-scene-lightkeeper-v{VERSION}-doc.zip"
  for path in (install, source, documentation):
    if path.exists():
      path.unlink()

  with zipfile.ZipFile(install, "w") as archive:
    add_tree(archive, RUNTIME, "runyth-scene-lightkeeper")
    add_file(archive, ROOT / "LICENSE", "runyth-scene-lightkeeper/LICENSE")
  with zipfile.ZipFile(source, "w") as archive:
    add_tree(archive, ROOT, f"runyth-scene-lightkeeper-v{VERSION}-src", SOURCE_EXCLUDES)
  create_documentation_archive(documentation)

  checksums = OUTPUT / f"runyth-scene-lightkeeper-v{VERSION}-SHA256SUMS.txt"
  checksums.write_text(
    "".join(f"{sha256(path)}  {path.name}\n" for path in (install, source, documentation)),
    encoding="utf-8"
  )
  print(install)
  print(source)
  print(documentation)
  print(checksums)


if __name__ == "__main__":
  main()
