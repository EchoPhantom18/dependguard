import base64
import re
from io import BytesIO

import requests
from flask import current_app
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from scanner import count_severities, detect_ecosystem, parse_dependencies


MANIFEST_PATHS = ["requirements.txt", "package.json", "pom.xml", "Pipfile"]

LICENSE_CATALOG = {
    "flask": "BSD-3-Clause",
    "django": "BSD-3-Clause",
    "requests": "Apache-2.0",
    "urllib3": "MIT",
    "lodash": "MIT",
    "express": "MIT",
    "axios": "MIT",
    "react": "MIT",
    "vite": "MIT",
    "log4j-core": "Apache-2.0",
    "spring-core": "Apache-2.0",
    "left-pad": "WTFPL",
}

RISKY_LICENSES = {"GPL", "GPL-2.0", "GPL-3.0", "AGPL", "AGPL-3.0", "LGPL", "LGPL-2.1", "LGPL-3.0", "UNKNOWN"}
SAFE_LICENSES = {"MIT", "Apache-2.0", "BSD", "BSD-2-Clause", "BSD-3-Clause", "ISC"}

POPULAR_PACKAGES = {
    "flask",
    "django",
    "requests",
    "urllib3",
    "lodash",
    "express",
    "axios",
    "react",
    "numpy",
    "pandas",
}

MOCK_TRANSITIVE_DEPENDENCIES = {
    "flask": ["werkzeug", "jinja2", "click"],
    "django": ["asgiref", "sqlparse"],
    "requests": ["urllib3", "certifi", "idna"],
    "express": ["body-parser", "qs", "debug"],
    "axios": ["follow-redirects"],
    "log4j-core": ["log4j-api"],
    "spring-core": ["spring-jcl"],
}

SEVERITY_COLORS = {
    "critical": "#ef4444",
    "high": "#f97316",
    "medium": "#eab308",
    "low": "#22c55e",
    "safe": "#22d3ee",
}


def parse_github_repo_url(repo_url):
    match = re.search(r"github\.com[:/](?P<owner>[^/\s]+)/(?P<repo>[^/\s#?]+)", repo_url or "")
    if not match:
        raise ValueError("Enter a valid GitHub repository URL")

    repo_name = match.group("repo").removesuffix(".git")
    return match.group("owner"), repo_name


def fetch_github_manifests(repo_url, branch=None):
    owner, repo = parse_github_repo_url(repo_url)
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "DependGuard-local-dashboard",
    }
    token = current_app.config.get("GITHUB_API_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    manifests = []
    for path in MANIFEST_PATHS:
        api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
        params = {"ref": branch} if branch else None
        response = requests.get(api_url, headers=headers, params=params, timeout=12)
        if response.status_code == 404:
            continue
        if response.status_code == 403:
            raise RuntimeError("GitHub API rate limit or permission error. Add GITHUB_API_TOKEN for higher limits.")
        response.raise_for_status()

        payload = response.json()
        content = payload.get("content") or ""
        encoding = payload.get("encoding")
        if encoding == "base64":
            manifest_text = base64.b64decode(content).decode("utf-8", errors="replace")
        else:
            manifest_text = content

        manifests.append(
            {
                "filename": path,
                "manifest_text": manifest_text,
                "html_url": payload.get("html_url"),
                "sha": payload.get("sha"),
            }
        )

    return owner, repo, manifests


def analyze_dependency_licenses(dependencies):
    findings = []
    for dependency in dependencies:
        package_name = dependency.get("name", "")
        license_name = LICENSE_CATALOG.get(package_name.lower(), "unknown")
        normalized = license_name.upper()

        if license_name == "unknown":
            risk_level = "high"
            reason = "License could not be identified and should be reviewed before release."
        elif normalized in RISKY_LICENSES or any(token in normalized for token in ("GPL", "AGPL", "LGPL")):
            risk_level = "high"
            reason = f"{license_name} can introduce copyleft obligations for distributed software."
        elif license_name in SAFE_LICENSES:
            risk_level = "safe"
            reason = f"{license_name} is commonly accepted for commercial and open-source projects."
        else:
            risk_level = "review"
            reason = f"{license_name} is uncommon in this mock catalog and should be checked by your team."

        findings.append(
            {
                "package_name": package_name,
                "version": dependency.get("version"),
                "license": license_name,
                "risk_level": risk_level,
                "reason": reason,
            }
        )

    return findings


def calculate_supply_chain_score(dependencies, vulnerabilities=None, licenses=None):
    vulnerabilities = vulnerabilities or []
    licenses = licenses or analyze_dependency_licenses(dependencies)
    vulnerabilities_by_package = _group_by_package(vulnerabilities)
    licenses_by_package = {item["package_name"].lower(): item for item in licenses}

    findings = []
    total_score = 0
    for dependency in dependencies:
        package_name = dependency.get("name", "")
        version = dependency.get("version") or "unknown"
        key = package_name.lower()
        reasons = []
        score = 8

        for vulnerability in vulnerabilities_by_package.get(key, []):
            severity = vulnerability.get("severity", "low")
            score += {"critical": 36, "high": 26, "medium": 16, "low": 8}.get(severity, 8)
            reasons.append(f"{severity.title()} vulnerability: {vulnerability.get('cve') or vulnerability.get('id')}")
            if vulnerability.get("safe_version"):
                score += 8
                reasons.append(f"Safer version available: {vulnerability['safe_version']}")

        license_item = licenses_by_package.get(key)
        if license_item and license_item["risk_level"] == "high":
            score += 20
            reasons.append(f"License review required: {license_item['license']}")
        elif license_item and license_item["risk_level"] == "review":
            score += 10
            reasons.append(f"Uncommon license: {license_item['license']}")

        if version == "unknown":
            score += 12
            reasons.append("Dependency is unpinned or version could not be detected.")
        elif version.startswith("0."):
            score += 8
            reasons.append("Pre-1.0 dependency can change behavior quickly.")

        typosquat_reason = _typosquat_reason(key)
        if typosquat_reason:
            score += 22
            reasons.append(typosquat_reason)

        if key not in LICENSE_CATALOG:
            score += 8
            reasons.append("Maintainer and release metadata unavailable; using conservative fallback.")

        score = min(100, score)
        total_score += score
        findings.append(
            {
                "package_name": package_name,
                "version": version,
                "score": score,
                "risk_level": _risk_level(score),
                "reasons": reasons or ["No major supply-chain warning detected."],
            }
        )

    overall_score = round(total_score / max(len(findings), 1))
    return {
        "overall_score": overall_score,
        "overall_risk_level": _risk_level(overall_score),
        "findings": findings,
    }


def build_attack_graph(scan):
    dependencies = parse_dependencies(scan.original_manifest, scan.manifest_type)
    findings = scan.findings or []
    findings_by_package = _group_by_package(findings)

    nodes = [
        {
            "id": "project",
            "type": "input",
            "position": {"x": 0, "y": 160},
            "data": {"label": scan.manifest_name, "severity": "safe"},
            "style": _node_style("safe", is_root=True),
        }
    ]
    edges = []
    paths = []

    for index, dependency in enumerate(dependencies):
        package_name = dependency.get("name")
        package_key = package_name.lower()
        severity = _highest_severity(findings_by_package.get(package_key, []))
        package_node_id = f"pkg:{package_key}"
        x = 280
        y = index * 120

        nodes.append(
            {
                "id": package_node_id,
                "position": {"x": x, "y": y},
                "data": {
                    "label": f"{package_name}@{dependency.get('version') or 'unknown'}",
                    "severity": severity,
                    "ecosystem": dependency.get("ecosystem") or detect_ecosystem(scan.manifest_type),
                },
                "style": _node_style(severity),
            }
        )
        edges.append(
            {
                "id": f"edge:project:{package_node_id}",
                "source": "project",
                "target": package_node_id,
                "animated": severity != "safe",
                "style": {"stroke": SEVERITY_COLORS[severity], "strokeWidth": 2},
            }
        )

        for transitive_index, transitive in enumerate(MOCK_TRANSITIVE_DEPENDENCIES.get(package_key, [])):
            transitive_node_id = f"transitive:{package_key}:{transitive}"
            nodes.append(
                {
                    "id": transitive_node_id,
                    "position": {"x": 560, "y": y + transitive_index * 58},
                    "data": {"label": transitive, "severity": "safe"},
                    "style": _node_style("safe"),
                }
            )
            edges.append(
                {
                    "id": f"edge:{package_node_id}:{transitive_node_id}",
                    "source": package_node_id,
                    "target": transitive_node_id,
                    "style": {"stroke": "rgba(34, 211, 238, 0.45)", "strokeWidth": 1.5},
                }
            )

        for vulnerability_index, vulnerability in enumerate(findings_by_package.get(package_key, [])):
            cve = vulnerability.get("cve") or vulnerability.get("id")
            cve_node_id = f"vuln:{package_key}:{vulnerability_index}"
            vuln_severity = vulnerability.get("severity", "low")
            nodes.append(
                {
                    "id": cve_node_id,
                    "position": {"x": 840, "y": y + vulnerability_index * 70},
                    "data": {"label": cve, "severity": vuln_severity},
                    "style": _node_style(vuln_severity),
                }
            )
            edges.append(
                {
                    "id": f"edge:{package_node_id}:{cve_node_id}",
                    "source": package_node_id,
                    "target": cve_node_id,
                    "animated": True,
                    "style": {"stroke": SEVERITY_COLORS.get(vuln_severity, SEVERITY_COLORS["low"]), "strokeWidth": 2.5},
                }
            )
            paths.append([scan.manifest_name, package_name, cve])

    return {
        "nodes": nodes,
        "edges": edges,
        "paths": paths,
        "legend": SEVERITY_COLORS,
    }


def generate_ci_yaml(provider="github", backend_url="http://localhost:5000/api", risk_threshold=70):
    provider = (provider or "github").lower()
    if provider == "gitlab":
        return _gitlab_ci_yaml(backend_url, risk_threshold)
    return _github_actions_yaml(backend_url, risk_threshold)


def explain_vulnerability(finding):
    package_name = finding.get("package") or finding.get("package_name") or "this package"
    cve = finding.get("cve") or finding.get("id") or "the vulnerability"
    severity = finding.get("severity", "unknown")
    safe_version = finding.get("safe_version") or "the patched version listed by the advisory"
    summary = finding.get("summary") or "A dependency security advisory matched this package version."

    return {
        "mode": "template",
        "title": f"{cve} in {package_name}",
        "what_it_means": f"{summary} DependGuard matched it against the version declared in your manifest.",
        "why_dangerous": (
            f"The finding is rated {severity}. Attackers often target vulnerable dependencies because "
            "they sit inside normal application code paths and may be reachable without changing your own source code."
        ),
        "how_to_fix": f"Upgrade {package_name} to {safe_version}, regenerate your lock file if you use one, and rerun tests.",
        "beginner_explanation": (
            "Think of a dependency like a building block your app borrows. If that block has a known crack, "
            "DependGuard tells you which newer block to use before someone can lean on the weak spot."
        ),
    }


def generate_security_pdf(scan, license_findings, supply_chain):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.55 * inch,
        leftMargin=0.55 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
    )
    styles = getSampleStyleSheet()
    story = [
        Paragraph(f"DependGuard Security Report: {scan.manifest_name}", styles["Title"]),
        Paragraph(f"Scan date: {scan.created_at.strftime('%Y-%m-%d %H:%M UTC') if scan.created_at else 'N/A'}", styles["Normal"]),
        Spacer(1, 0.18 * inch),
    ]

    summary_rows = [
        ["Metric", "Value"],
        ["Security score", f"{max(0, 100 - (scan.risk_score or 0))}/100"],
        ["Risk score", f"{scan.risk_score}/100"],
        ["Supply-chain score", f"{supply_chain['overall_score']}/100 ({supply_chain['overall_risk_level']})"],
        ["Dependencies", str(scan.total_dependencies)],
        ["Vulnerabilities", str(scan.vulnerability_count)],
    ]
    story.append(_styled_table(summary_rows, [2.1 * inch, 4.3 * inch]))
    story.append(Spacer(1, 0.2 * inch))

    severity_counts = scan.severity_counts or count_severities(scan.findings or [])
    story.append(Paragraph("Severity Summary", styles["Heading2"]))
    story.append(
        _styled_table(
            [["Critical", "High", "Medium", "Low"], [
                severity_counts.get("critical", 0),
                severity_counts.get("high", 0),
                severity_counts.get("medium", 0),
                severity_counts.get("low", 0),
            ]],
            [1.6 * inch] * 4,
        )
    )
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("Recommended Fixes", styles["Heading2"]))
    fix_rows = [["Package", "Severity", "Fix"]]
    for finding in (scan.findings or [])[:12]:
        fix_rows.append([
            finding.get("package", "Unknown"),
            finding.get("severity", "low").title(),
            finding.get("fix") or f"Upgrade to {finding.get('safe_version', 'a safe release')}",
        ])
    if len(fix_rows) == 1:
        fix_rows.append(["None", "Safe", "No vulnerability fixes are currently required."])
    story.append(_styled_table(fix_rows, [1.5 * inch, 1.1 * inch, 3.8 * inch]))
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("License Risks", styles["Heading2"]))
    license_rows = [["Package", "License", "Risk"]]
    for item in license_findings[:12]:
        license_rows.append([item["package_name"], item["license"], item["risk_level"].title()])
    story.append(_styled_table(license_rows, [2.1 * inch, 2.1 * inch, 2.2 * inch]))
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("Safe Manifest Preview", styles["Heading2"]))
    safe_manifest = (scan.safe_manifest or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    preview = "<br/>".join(safe_manifest.splitlines()[:24]) or "No safe manifest generated."
    story.append(Paragraph(f"<font name='Courier'>{preview}</font>", styles["BodyText"]))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def _github_actions_yaml(backend_url, risk_threshold):
    return f"""name: DependGuard

on:
  push:
  pull_request:

jobs:
  dependency-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Find dependency manifest
        run: |
          for file in requirements.txt package.json pom.xml Pipfile; do
            if [ -f "$file" ]; then
              echo "MANIFEST_FILE=$file" >> "$GITHUB_ENV"
              exit 0
            fi
          done
          echo "No supported manifest found"
          exit 1
      - name: Scan with DependGuard
        env:
          DEPENDGUARD_API_URL: {backend_url}
          DEPENDGUARD_TOKEN: ${{{{ secrets.DEPENDGUARD_TOKEN }}}}
          RISK_THRESHOLD: "{risk_threshold}"
        run: |
          python - <<'PY' > dependguard-payload.json
          import json, os
          path = os.environ["MANIFEST_FILE"]
          with open(path, encoding="utf-8") as handle:
              manifest_text = handle.read()
          print(json.dumps({{"filename": path, "manifest_text": manifest_text, "config": {{"ci": True}}}}))
          PY
          curl -f -X POST "$DEPENDGUARD_API_URL/scans" \\
            -H "Authorization: Bearer $DEPENDGUARD_TOKEN" \\
            -H "Content-Type: application/json" \\
            --data @dependguard-payload.json > dependguard-result.json
          python - <<'PY'
          import json, os, sys
          result = json.load(open("dependguard-result.json", encoding="utf-8"))
          risk = result["scan"]["risk_score"]
          print(f"DependGuard risk score: {{risk}}")
          if risk >= int(os.environ["RISK_THRESHOLD"]):
              sys.exit("Risk threshold exceeded")
          PY
"""


def _gitlab_ci_yaml(backend_url, risk_threshold):
    return f"""stages:
  - security

dependguard_scan:
  stage: security
  image: python:3.12-slim
  rules:
    - if: $CI_PIPELINE_SOURCE == "push"
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  script:
    - |
      for file in requirements.txt package.json pom.xml Pipfile; do
        if [ -f "$file" ]; then
          export MANIFEST_FILE="$file"
          break
        fi
      done
      test -n "$MANIFEST_FILE"
    - |
      python - <<'PY' > dependguard-payload.json
      import json, os
      path = os.environ["MANIFEST_FILE"]
      with open(path, encoding="utf-8") as handle:
          manifest_text = handle.read()
      print(json.dumps({{"filename": path, "manifest_text": manifest_text, "config": {{"ci": True}}}}))
      PY
    - |
      curl -f -X POST "{backend_url}/scans" \\
        -H "Authorization: Bearer $DEPENDGUARD_TOKEN" \\
        -H "Content-Type: application/json" \\
        --data @dependguard-payload.json > dependguard-result.json
    - |
      python - <<'PY'
      import json, sys
      result = json.load(open("dependguard-result.json", encoding="utf-8"))
      risk = result["scan"]["risk_score"]
      print(f"DependGuard risk score: {{risk}}")
      if risk >= {risk_threshold}:
          sys.exit("Risk threshold exceeded")
      PY
"""


def _group_by_package(findings):
    grouped = {}
    for finding in findings:
        key = (finding.get("package") or finding.get("package_name") or "").lower()
        grouped.setdefault(key, []).append(finding)
    return grouped


def _highest_severity(findings):
    order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    highest = "safe"
    for finding in findings:
        severity = finding.get("severity", "low")
        if order.get(severity, 0) > order.get(highest, 0):
            highest = severity
    return highest


def _node_style(severity, is_root=False):
    color = SEVERITY_COLORS.get(severity, SEVERITY_COLORS["safe"])
    return {
        "border": f"1px solid {color}",
        "background": "rgba(15, 23, 42, 0.96)" if not is_root else "rgba(8, 47, 73, 0.96)",
        "color": "#f8fafc",
        "boxShadow": f"0 0 22px {color}44",
        "borderRadius": 8,
        "padding": 10,
        "fontSize": 12,
    }


def _risk_level(score):
    if score >= 75:
        return "critical"
    if score >= 55:
        return "high"
    if score >= 30:
        return "medium"
    return "low"


def _typosquat_reason(package_name):
    for popular in POPULAR_PACKAGES:
        if package_name == popular:
            return None
        if abs(len(package_name) - len(popular)) <= 1 and _edit_distance(package_name, popular) == 1:
            return f"Package name is very close to popular package '{popular}', possible typosquatting."
    return None


def _edit_distance(left, right):
    if len(left) < len(right):
        return _edit_distance(right, left)
    if len(right) == 0:
        return len(left)

    previous = list(range(len(right) + 1))
    for index_left, char_left in enumerate(left, start=1):
        current = [index_left]
        for index_right, char_right in enumerate(right, start=1):
            insert_cost = current[index_right - 1] + 1
            delete_cost = previous[index_right] + 1
            replace_cost = previous[index_right - 1] + (char_left != char_right)
            current.append(min(insert_cost, delete_cost, replace_cost))
        previous = current
    return previous[-1]


def _styled_table(rows, col_widths):
    table = Table(rows, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5e1")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table
