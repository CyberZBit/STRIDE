import hashlib
import json
import os
import plistlib
import sys
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZipFile


def make_source(ipa: Path) -> dict:
    repo = os.environ["GITHUB_REPOSITORY"]
    run_number = os.environ["GITHUB_RUN_NUMBER"]
    attempt = os.environ["GITHUB_RUN_ATTEMPT"]
    build = f"{run_number}.{attempt}"
    site = f"https://github.com/{repo}"
    icon = f"https://raw.githubusercontent.com/{repo}/{os.environ['GITHUB_SHA']}/assets/icon.png"

    with ZipFile(ipa) as archive:
        info = plistlib.loads(archive.read("Payload/STRIDE.app/Info.plist"))
    if info["CFBundleVersion"] != build:
        raise ValueError(f"IPA build {info['CFBundleVersion']} does not match CI build {build}")

    checksum = hashlib.sha256()
    with ipa.open("rb") as binary:
        for block in iter(lambda: binary.read(1024 * 1024), b""):
            checksum.update(block)

    return {
        "name": "STRIDE",
        "website": site,
        "iconURL": icon,
        "tintColor": "#FF7938",
        "apps": [{
            "name": "STRIDE",
            "bundleIdentifier": info["CFBundleIdentifier"],
            "developerName": repo.split("/")[0],
            "localizedDescription": "Record walks and review your walking history on iPhone.",
            "iconURL": icon,
            "tintColor": "#FF7938",
            "versions": [{
                "version": info["CFBundleShortVersionString"],
                "buildVersion": build,
                "date": datetime.now(timezone.utc).date().isoformat(),
                "downloadURL": f"{site}/releases/download/stride-ios-{build}/{ipa.name}",
                "size": ipa.stat().st_size,
                "sha256": checksum.hexdigest(),
                "minOSVersion": info["MinimumOSVersion"],
            }],
            "appPermissions": {
                "entitlements": [],
                "privacy": {
                    key: value for key, value in info.items()
                    if key.startswith("NS") and key.endswith("UsageDescription") and isinstance(value, str)
                },
            },
        }],
        "news": [],
    }


if __name__ == "__main__":
    ipa, output = map(Path, sys.argv[1:])
    output.write_text(json.dumps(make_source(ipa), indent=2) + "\n", encoding="utf-8")
