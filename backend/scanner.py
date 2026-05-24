import json
import re
import tomllib
import xml.etree.ElementTree as ET
from copy import deepcopy

from packaging.version import InvalidVersion, Version


VULNERABILITY_DB = {
    "flask": {
        "ecosystem": "PyPI",
        "max_affected_version": "1.0",
        "safe_version": "3.0.3",
        "severity": "high",
        "cve": "CVE-2018-MOCK-FLASK",
        "summary": "Legacy Flask release with known debug and dependency-chain exposure.",
        "fix": "Upgrade Flask to 3.0.3 or newer and rerun your test suite.",
    },
    "django": {
        "ecosystem": "PyPI",
        "max_affected_version": "2.0",
        "safe_version": "4.2.16",
        "severity": "critical",
        "cve": "CVE-2019-MOCK-DJANGO",
        "summary": "Unsupported Django branch with authentication and request-handling risks.",
        "fix": "Move to a supported Django LTS release and check middleware compatibility.",
    },
    "requests": {
        "ecosystem": "PyPI",
        "max_affected_version": "2.19.0",
        "safe_version": "2.32.3",
        "severity": "medium",
        "cve": "CVE-2018-MOCK-REQUESTS",
        "summary": "Old Requests release can inherit vulnerable transitive networking libraries.",
        "fix": "Upgrade Requests and refresh urllib3/certifi transitive pins.",
    },
    "urllib3": {
        "ecosystem": "PyPI",
        "max_affected_version": "1.24.1",
        "safe_version": "2.2.3",
        "severity": "high",
        "cve": "CVE-2020-MOCK-URLLIB3",
        "summary": "Old urllib3 release may mishandle redirects and TLS edge cases.",
        "fix": "Upgrade urllib3 directly or through your HTTP client dependency.",
    },
    "lodash": {
        "ecosystem": "npm",
        "max_affected_version": "4.17.20",
        "safe_version": "4.17.21",
        "severity": "high",
        "cve": "CVE-2021-MOCK-LODASH",
        "summary": "Old Lodash versions are frequently linked to prototype pollution issues.",
        "fix": "Upgrade Lodash to 4.17.21 or newer.",
    },
    "express": {
        "ecosystem": "npm",
        "max_affected_version": "4.16.4",
        "safe_version": "4.18.3",
        "severity": "medium",
        "cve": "CVE-2022-MOCK-EXPRESS",
        "summary": "Old Express versions can carry stale router and transitive middleware risks.",
        "fix": "Upgrade Express and review middleware compatibility.",
    },
    "axios": {
        "ecosystem": "npm",
        "max_affected_version": "0.21.1",
        "safe_version": "1.7.7",
        "severity": "high",
        "cve": "CVE-2023-MOCK-AXIOS",
        "summary": "Old Axios versions have a history of request and header handling issues.",
        "fix": "Upgrade Axios to the latest stable major release.",
    },
    "log4j-core": {
        "ecosystem": "Maven",
        "max_affected_version": "2.14.1",
        "safe_version": "2.17.2",
        "severity": "critical",
        "cve": "CVE-2021-MOCK-LOG4SHELL",
        "summary": "Mock Log4Shell-style finding for vulnerable Log4j Core manifests.",
        "fix": "Upgrade Log4j Core to 2.17.2 or newer.",
    },
    "spring-core": {
        "ecosystem": "Maven",
        "max_affected_version": "5.3.17",
        "safe_version": "5.3.39",
        "severity": "high",
        "cve": "CVE-2022-MOCK-SPRING",
        "summary": "Old Spring Core release used as sample vulnerable Maven dependency.",
        "fix": "Upgrade Spring Core and run integration tests for framework behavior.",
    },
}

SEVERITY_WEIGHTS = {
    "critical": 30,
    "high": 22,
    "medium": 12,
    "low": 5,
}


def detect_manifest_type(filename="", manifest_text=""):
    name = (filename or "").lower()
    text = (manifest_text or "").strip()

    if name.endswith("package.json") or text.startswith("{"):
        return "package.json"
    if name.endswith("pom.xml") or "<project" in text[:500].lower():
        return "pom.xml"
    if name.endswith("pipfile") or "[packages]" in text.lower():
        return "Pipfile"
    return "requirements.txt"


def parse_dependencies(manifest_text, manifest_type):
    parsers = {
        "package.json": _parse_package_json,
        "pom.xml": _parse_pom_xml,
        "Pipfile": _parse_pipfile,
        "requirements.txt": _parse_requirements,
    }
    return parsers.get(manifest_type, _parse_requirements)(manifest_text or "")


def scan_manifest(manifest_text, filename="", config=None, vulnerability_lookup=None):
    manifest_type = detect_manifest_type(filename, manifest_text)
    dependencies = parse_dependencies(manifest_text, manifest_type)
    warnings = []

    if vulnerability_lookup:
        findings, warnings = detect_live_vulnerabilities(
            dependencies,
            manifest_type,
            vulnerability_lookup,
        )
        scan_mode = "live_osv"
    else:
        findings = detect_vulnerabilities(dependencies)
        scan_mode = "mock"

    severity_counts = count_severities(findings)
    risk_score = calculate_risk_score(findings, len(dependencies))
    safe_manifest = generate_safe_manifest(manifest_text, manifest_type, findings)
    scan_config = {**(config or {}), "scan_mode": scan_mode, "warnings": warnings}

    return {
        "manifest_name": filename or manifest_type,
        "manifest_type": manifest_type,
        "total_dependencies": len(dependencies),
        "vulnerability_count": len(findings),
        "risk_score": risk_score,
        "security_score": max(0, 100 - risk_score),
        "severity_counts": severity_counts,
        "findings": findings,
        "safe_manifest": safe_manifest,
        "config": scan_config,
        "warnings": warnings,
    }


def detect_live_vulnerabilities(dependencies, manifest_type, vulnerability_lookup):
    findings = []
    warnings = []

    for dependency in dependencies:
        package_name = dependency["name"]
        version = normalize_version(dependency.get("version"))
        ecosystem = dependency.get("ecosystem") or detect_ecosystem(manifest_type)
        if not package_name or not version or version == "unknown" or not ecosystem:
            continue

        lookup_result = vulnerability_lookup(package_name, version, ecosystem)
        if lookup_result.get("warning") and lookup_result["warning"] not in warnings:
            warnings.append(lookup_result["warning"])

        for vulnerability in lookup_result.get("vulnerabilities", []):
            vulnerability["line"] = dependency.get("line")
            vulnerability["section"] = dependency.get("section")
            findings.append(vulnerability)

    return findings, warnings


def detect_ecosystem(manifest_type):
    ecosystems = {
        "requirements.txt": "PyPI",
        "Pipfile": "PyPI",
        "package.json": "npm",
        "pom.xml": "Maven",
    }
    return ecosystems.get(manifest_type)


def detect_vulnerabilities(dependencies):
    findings = []
    for dependency in dependencies:
        package_name = dependency["name"].lower()
        intelligence = VULNERABILITY_DB.get(package_name)
        if not intelligence:
            continue

        current_version = normalize_version(dependency.get("version"))
        if not current_version or current_version == "unknown":
            continue

        if is_version_at_or_below(current_version, intelligence["max_affected_version"]):
            findings.append(
                {
                    "id": f"{package_name}-{current_version}-{len(findings) + 1}",
                    "package": dependency["name"],
                    "current_version": current_version,
                    "safe_version": intelligence["safe_version"],
                    "severity": intelligence["severity"],
                    "cve": intelligence["cve"],
                    "summary": intelligence["summary"],
                    "explanation": (
                        f"{dependency['name']} {current_version} is at or below the "
                        f"mock affected threshold {intelligence['max_affected_version']}. "
                        "DependGuard flags it so you can upgrade before shipping."
                    ),
                    "fix": intelligence["fix"],
                    "ecosystem": intelligence["ecosystem"],
                    "line": dependency.get("line"),
                }
            )
    return findings


def calculate_risk_score(findings, total_dependencies):
    if not findings:
        return 0

    weighted = 0
    for item in findings:
        cvss_score = item.get("cvss_score")
        if isinstance(cvss_score, (int, float)):
            weighted += round(cvss_score * 3)
        else:
            weighted += SEVERITY_WEIGHTS.get(item.get("severity", "low"), 5)

    density_bonus = min(20, round((len(findings) / max(total_dependencies, 1)) * 25))
    return min(100, weighted + density_bonus)


def count_severities(findings):
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for finding in findings:
        severity = finding.get("severity", "low")
        if severity not in counts:
            severity = "low"
        counts[severity] = counts.get(severity, 0) + 1
    return counts


def generate_safe_manifest(manifest_text, manifest_type=None, findings=None):
    manifest_type = manifest_type or detect_manifest_type("", manifest_text)
    findings = findings if findings is not None else detect_vulnerabilities(
        parse_dependencies(manifest_text, manifest_type)
    )
    if not findings:
        return manifest_text or ""

    if manifest_type == "package.json":
        return _generate_safe_package_json(manifest_text, findings)
    if manifest_type == "pom.xml":
        return _generate_safe_pom(manifest_text, findings)
    if manifest_type == "Pipfile":
        return _generate_safe_pipfile(manifest_text, findings)
    return _generate_safe_requirements(manifest_text, findings)


def build_report(scan):
    findings = scan.findings or []
    severity_counts = scan.severity_counts or count_severities(findings)
    report_lines = [
        f"# DependGuard Report: {scan.manifest_name}",
        "",
        f"- Manifest type: {scan.manifest_type}",
        f"- Total dependencies: {scan.total_dependencies}",
        f"- Vulnerabilities found: {scan.vulnerability_count}",
        f"- Risk score: {scan.risk_score}/100",
        f"- Security score: {max(0, 100 - (scan.risk_score or 0))}/100",
        "",
        "## Severity Breakdown",
        "",
        f"- Critical: {severity_counts.get('critical', 0)}",
        f"- High: {severity_counts.get('high', 0)}",
        f"- Medium: {severity_counts.get('medium', 0)}",
        f"- Low: {severity_counts.get('low', 0)}",
        "",
        "## Findings",
        "",
    ]

    if not findings:
        report_lines.append("No vulnerabilities were detected in this manifest.")
    else:
        for item in findings:
            report_lines.extend(
                [
                    f"### {item['package']} {item['current_version']}",
                    "",
                    f"- Severity: {item['severity'].title()}",
                    f"- CVE: {item['cve']}",
                    f"- Safe version: {item['safe_version']}",
                    f"- CVSS: {item.get('cvss_score') or item.get('cvss_vector') or 'Not listed'}",
                    f"- Summary: {item['summary']}",
                    f"- Fix: {item['fix']}",
                    "",
                ]
            )

    return "\n".join(report_lines)


def get_intelligence():
    return [
        {"package": package_name, **deepcopy(data)}
        for package_name, data in sorted(VULNERABILITY_DB.items())
    ]


def normalize_version(raw_version):
    if raw_version is None:
        return "unknown"

    text = str(raw_version).strip().strip('"').strip("'")
    if text in {"", "*"}:
        return "unknown"

    match = re.search(r"\d+(?:\.\d+){0,4}", text)
    return match.group(0) if match else "unknown"


def is_version_at_or_below(current, maximum):
    try:
        return Version(current) <= Version(maximum)
    except InvalidVersion:
        return current <= maximum


def _parse_requirements(text):
    dependencies = []
    pattern = re.compile(r"^\s*([A-Za-z0-9_.-]+)\s*(==|~=|>=|<=|>|<|=)?\s*([^;#\s]+)?")
    for index, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "://" in stripped:
            continue
        match = pattern.match(stripped)
        if match:
            dependencies.append(
                {
                    "name": match.group(1),
                    "version": normalize_version(match.group(3)),
                    "line": index,
                    "section": "requirements",
                }
            )
    return dependencies


def _parse_package_json(text):
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return []

    dependencies = []
    for section in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
        for package_name, version in (data.get(section) or {}).items():
            dependencies.append(
                {
                    "name": package_name,
                    "version": normalize_version(version),
                    "line": None,
                    "section": section,
                }
            )
    return dependencies


def _parse_pom_xml(text):
    try:
        root = ET.fromstring(text)
    except ET.ParseError:
        return []

    dependencies = []
    for dependency in root.iter():
        if not dependency.tag.endswith("dependency"):
            continue
        artifact_id = _find_xml_child_text(dependency, "artifactId")
        version = _find_xml_child_text(dependency, "version")
        if artifact_id:
            dependencies.append(
                {
                    "name": artifact_id,
                    "version": normalize_version(version),
                    "line": None,
                    "section": "dependencies",
                }
            )
    return dependencies


def _parse_pipfile(text):
    try:
        data = tomllib.loads(text)
    except tomllib.TOMLDecodeError:
        return _parse_requirements(text)

    dependencies = []
    for section in ("packages", "dev-packages"):
        for package_name, value in (data.get(section) or {}).items():
            version = value if isinstance(value, str) else value.get("version", "")
            dependencies.append(
                {
                    "name": package_name,
                    "version": normalize_version(version),
                    "line": None,
                    "section": section,
                }
            )
    return dependencies


def _find_xml_child_text(parent, child_name):
    for child in parent:
        if child.tag.endswith(child_name):
            return child.text
    return None


def _generate_safe_requirements(text, findings):
    replacements = _safe_version_replacements(findings)
    output = []
    pattern = re.compile(r"^(\s*)([A-Za-z0-9_.-]+)(\s*(?:==|~=|>=|<=|>|<|=)\s*)([^;#\s]+)(.*)$")

    for line in (text or "").splitlines():
        match = pattern.match(line)
        if match and match.group(2).lower() in replacements:
            output.append(
                f"{match.group(1)}{match.group(2)}=={replacements[match.group(2).lower()]}{match.group(5)}"
            )
        else:
            output.append(line)
    return "\n".join(output)


def _generate_safe_package_json(text, findings):
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return _generate_safe_requirements(text, findings)

    replacements = _safe_version_replacements(findings)
    for section in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
        dependencies = data.get(section) or {}
        for package_name, version in list(dependencies.items()):
            safe_version = replacements.get(package_name.lower())
            if safe_version:
                prefix = str(version)[0] if str(version).startswith(("^", "~")) else ""
                dependencies[package_name] = f"{prefix}{safe_version}"

    return json.dumps(data, indent=2)


def _generate_safe_pipfile(text, findings):
    replacements = _safe_version_replacements(findings)
    output = []
    pattern = re.compile(r'^(\s*["\']?([A-Za-z0-9_.-]+)["\']?\s*=\s*")([^"]*)(".*)$')

    for line in (text or "").splitlines():
        match = pattern.match(line)
        if match and match.group(2).lower() in replacements:
            output.append(f'{match.group(1)}=={replacements[match.group(2).lower()]}{match.group(4)}')
        else:
            output.append(line)
    return "\n".join(output)


def _generate_safe_pom(text, findings):
    safe_text = text or ""
    for item in findings:
        safe_version = _safe_version_for_replacement(item)
        if not safe_version:
            continue
        package_pattern = re.escape(item["package"])
        pattern = re.compile(
            rf"(<artifactId>\s*{package_pattern}\s*</artifactId>\s*.*?<version>)(.*?)(</version>)",
            re.IGNORECASE | re.DOTALL,
        )
        safe_text = pattern.sub(rf"\g<1>{safe_version}\3", safe_text)
    return safe_text


def _safe_version_replacements(findings):
    replacements = {}
    for item in findings:
        safe_version = _safe_version_for_replacement(item)
        if safe_version:
            replacements[item["package"].lower()] = safe_version
    return replacements


def _safe_version_for_replacement(finding):
    fixed_versions = finding.get("fixed_versions") or []
    if fixed_versions:
        return fixed_versions[0]

    safe_version = finding.get("safe_version")
    if not safe_version or safe_version.lower().startswith("no fixed"):
        return None
    return safe_version
