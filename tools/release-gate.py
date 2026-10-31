#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "dist"


def run(command: list[str], cwd: Path = ROOT) -> None:
  print(f"+ {' '.join(command)}")
  subprocess.run(command, cwd=cwd, check=True)


def digest(path: Path) -> str:
  value = hashlib.sha256()
  with path.open("rb") as stream:
    for chunk in iter(lambda: stream.read(1024 * 1024), b""):
      value.update(chunk)
  return value.hexdigest()


def safe_archive_names(archive: zipfile.ZipFile) -> list[str]:
  names = archive.namelist()
  if len(names) != len(set(names)):
    raise RuntimeError(f"Duplicate archive entries in {archive.filename}")
  for name in names:
    path = Path(name)
    if path.is_absolute() or ".." in path.parts or not path.parts:
      raise RuntimeError(f"Unsafe archive path in {archive.filename}: {name}")
  bad = archive.testzip()
  if bad:
    raise RuntimeError(f"Corrupt ZIP entry in {archive.filename}: {bad}")
  return names


def verify_install_archive(path: Path) -> None:
  with zipfile.ZipFile(path) as archive:
    names = safe_archive_names(archive)
  roots = {Path(name).parts[0] for name in names}
  if roots != {"runyth-scene-lightkeeper"}:
    raise RuntimeError(f"Install archive root mismatch: {roots}")
  required = {
    "runyth-scene-lightkeeper/module.json",
    "runyth-scene-lightkeeper/scripts/main.mjs",
    "runyth-scene-lightkeeper/scripts/ui/settings-launcher.mjs",
    "runyth-scene-lightkeeper/scripts/applications/floating-board.mjs",
    "runyth-scene-lightkeeper/templates/control-panel.hbs",
    "runyth-scene-lightkeeper/templates/floating-board.hbs",
    "runyth-scene-lightkeeper/styles/runyth-scene-lightkeeper.css"
  }
  missing = required.difference(names)
  if missing:
    raise RuntimeError(f"Install archive is missing: {sorted(missing)}")
  forbidden_fragments = ("/tests/", "/tools/", "/docs/", "/package.json", "/README.md", "/CHANGELOG.md")
  forbidden = [name for name in names if any(fragment in name for fragment in forbidden_fragments)]
  if forbidden:
    raise RuntimeError(f"Install archive contains source-only files: {forbidden[:5]}")


def verify_source_archive(path: Path) -> None:
  with zipfile.ZipFile(path) as archive:
    names = safe_archive_names(archive)
  roots = {Path(name).parts[0] for name in names}
  source_root = f"runyth-scene-lightkeeper-v{json.loads((ROOT / 'module/module.json').read_text(encoding='utf-8'))['version']}-src"
  if roots != {source_root}:
    raise RuntimeError(f"Source archive root mismatch: {roots}")
  required = {
    f"{source_root}/package.json",
    f"{source_root}/module/module.json",
    f"{source_root}/module/scripts/ui/settings-launcher.mjs",
    f"{source_root}/tests/application-actions.test.mjs",
    f"{source_root}/tests/context-time.test.mjs",
    f"{source_root}/tests/floating-board-sticky.test.mjs",
    f"{source_root}/tests/settings-launcher.test.mjs",
    f"{source_root}/tests/settings-behavior.test.mjs",
    f"{source_root}/tests/time-systems.test.mjs",
    f"{source_root}/tests/localization.test.mjs",
    f"{source_root}/docs/API.md",
    f"{source_root}/docs/LOCALIZATION.md",
    f"{source_root}/docs/BUILD_REPORT_1.1.5.md",
    f"{source_root}/docs/COMPATIBILITY_AUDIT_1.1.5.md",
    f"{source_root}/docs/VALIDATION_1.1.5.txt",
    f"{source_root}/docs/TEST_RESULTS_1.1.5.txt",
    f"{source_root}/tools/package.py",
    f"{source_root}/tools/release-gate.py"
  }
  missing = required.difference(names)
  if missing:
    raise RuntimeError(f"Source archive is missing: {sorted(missing)}")


def verify_documentation_archive(path: Path) -> None:
  with zipfile.ZipFile(path) as archive:
    names = safe_archive_names(archive)
  roots = {Path(name).parts[0] for name in names}
  doc_root = f"runyth-scene-lightkeeper-v{json.loads((ROOT / 'module/module.json').read_text(encoding='utf-8'))['version']}-doc"
  if roots != {doc_root}:
    raise RuntimeError(f"Documentation archive root mismatch: {roots}")
  required = {
    f"{doc_root}/README.md",
    f"{doc_root}/CHANGELOG.md",
    f"{doc_root}/LICENSE",
    f"{doc_root}/module.json",
    f"{doc_root}/docs/API.md",
    f"{doc_root}/docs/LOCALIZATION.md",
    f"{doc_root}/docs/MANUAL_TEST_CHECKLIST.md",
    f"{doc_root}/docs/BUILD_REPORT_1.1.5.md",
    f"{doc_root}/docs/COMPATIBILITY_AUDIT_1.1.5.md",
    f"{doc_root}/docs/VALIDATION_1.1.5.txt",
    f"{doc_root}/docs/TEST_RESULTS_1.1.5.txt"
  }
  missing = required.difference(names)
  if missing:
    raise RuntimeError(f"Documentation archive is missing: {sorted(missing)}")
  forbidden_fragments = ("/module/scripts/", "/tests/", "/tools/", "/node_modules/", "/dist/")
  forbidden = [name for name in names if any(fragment in name for fragment in forbidden_fragments)]
  if forbidden:
    raise RuntimeError(f"Documentation archive contains implementation files: {forbidden[:5]}")


def build(output: Path, cwd: Path = ROOT) -> tuple[Path, Path, Path, Path]:
  run([sys.executable, "tools/package.py", str(output)], cwd=cwd)
  manifest = json.loads((cwd / "module/module.json").read_text(encoding="utf-8"))
  version = manifest["version"]
  return (
    output / f"runyth-scene-lightkeeper-v{version}-mod.zip",
    output / f"runyth-scene-lightkeeper-v{version}-src.zip",
    output / f"runyth-scene-lightkeeper-v{version}-doc.zip",
    output / f"runyth-scene-lightkeeper-v{version}-SHA256SUMS.txt"
  )


def assert_identical(left: Path, right: Path, label: str) -> None:
  if left.read_bytes() != right.read_bytes():
    raise RuntimeError(f"Non-reproducible {label}: {left} != {right}")


def main() -> None:
  run(["npm", "run", "check"])

  with tempfile.TemporaryDirectory(prefix="runyth-scene-lightkeeper-release-") as temporary:
    temp = Path(temporary)
    build_a = build(temp / "build-a")
    build_b = build(temp / "build-b")

    verify_install_archive(build_a[0])
    verify_source_archive(build_a[1])
    verify_documentation_archive(build_a[2])
    assert_identical(build_a[0], build_b[0], "install archive")
    assert_identical(build_a[1], build_b[1], "source archive")
    assert_identical(build_a[2], build_b[2], "documentation archive")
    assert_identical(build_a[3], build_b[3], "checksum file")

    extracted = temp / "extracted"
    with zipfile.ZipFile(build_a[1]) as archive:
      archive.extractall(extracted)
    version = json.loads((ROOT / "module/module.json").read_text(encoding="utf-8"))["version"]
    source_root = extracted / f"runyth-scene-lightkeeper-v{version}-src"
    run(["npm", "run", "check"], cwd=source_root)
    rebuilt = build(temp / "rebuilt", cwd=source_root)
    assert_identical(build_a[0], rebuilt[0], "install archive rebuilt from source ZIP")
    assert_identical(build_a[1], rebuilt[1], "source archive rebuilt from source ZIP")
    assert_identical(build_a[2], rebuilt[2], "documentation archive rebuilt from source ZIP")
    assert_identical(build_a[3], rebuilt[3], "checksums rebuilt from source ZIP")

    OUTPUT.mkdir(parents=True, exist_ok=True)
    for artifact in build_a:
      shutil.copy2(artifact, OUTPUT / artifact.name)

    print("Release gate passed:")
    print(f"  install       sha256: {digest(build_a[0])}")
    print(f"  source        sha256: {digest(build_a[1])}")
    print(f"  documentation sha256: {digest(build_a[2])}")
    print("  independent builds: byte-identical")
    print("  source-ZIP rebuild: byte-identical")


if __name__ == "__main__":
  main()
