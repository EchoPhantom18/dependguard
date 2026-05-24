from flask import Blueprint, Response, abort, current_app, g, jsonify, request

from auth import token_required
from extensions import db
from models import (
    CIConfig,
    GeneratedReport,
    LicenseFinding,
    RepositoryScan,
    Scan,
    SupplyChainFinding,
)
from scanner import detect_manifest_type, parse_dependencies, scan_manifest
from services.advanced_service import (
    analyze_dependency_licenses,
    build_attack_graph,
    calculate_supply_chain_score,
    explain_vulnerability,
    fetch_github_manifests,
    generate_ci_yaml,
    generate_security_pdf,
)
from services.osv_service import fetch_vulnerabilities


advanced_bp = Blueprint("advanced", __name__, url_prefix="/api")


@advanced_bp.post("/repo/scan")
@token_required
def scan_repository():
    data = request.get_json(silent=True) or {}
    repo_url = (data.get("repo_url") or "").strip()
    branch = (data.get("branch") or "").strip() or None

    if not repo_url:
        return jsonify({"message": "repo_url is required"}), 400

    try:
        owner, repo, manifests = fetch_github_manifests(repo_url, branch)
    except ValueError as error:
        return jsonify({"message": str(error)}), 400
    except Exception as error:
        current_app.logger.exception("[RepoScanner] GitHub repository scan failed")
        return jsonify({"message": f"GitHub repository scan failed: {error}"}), 502

    if not manifests:
        repository_scan = RepositoryScan(
            user_id=g.current_user.id,
            repo_url=repo_url,
            repo_owner=owner,
            repo_name=repo,
            branch=branch,
            manifests=[],
            scan_ids=[],
            status="empty",
            message="No supported manifest files found.",
        )
        db.session.add(repository_scan)
        db.session.commit()
        return jsonify({"repository_scan": repository_scan.to_dict(), "scans": []}), 200

    lookup = fetch_vulnerabilities if current_app.config["USE_LIVE_CVE"] else None
    saved_scans = []
    for manifest in manifests:
        result = scan_manifest(
            manifest["manifest_text"],
            manifest["filename"],
            config={"source": "github", "repo_url": repo_url, "branch": branch},
            vulnerability_lookup=lookup,
        )
        scan = Scan(
            user_id=g.current_user.id,
            manifest_name=f"{owner}/{repo}:{manifest['filename']}",
            manifest_type=result["manifest_type"],
            original_manifest=manifest["manifest_text"],
            safe_manifest=result["safe_manifest"],
            total_dependencies=result["total_dependencies"],
            vulnerability_count=result["vulnerability_count"],
            risk_score=result["risk_score"],
            severity_counts=result["severity_counts"],
            findings=result["findings"],
            config=result["config"],
        )
        db.session.add(scan)
        saved_scans.append(scan)

    db.session.flush()
    repository_scan = RepositoryScan(
        user_id=g.current_user.id,
        repo_url=repo_url,
        repo_owner=owner,
        repo_name=repo,
        branch=branch,
        manifests=[{"filename": item["filename"], "html_url": item.get("html_url")} for item in manifests],
        scan_ids=[scan.id for scan in saved_scans],
        status="completed",
        message=f"Scanned {len(saved_scans)} manifest file(s).",
    )
    db.session.add(repository_scan)
    db.session.commit()

    return jsonify(
        {
            "repository_scan": repository_scan.to_dict(),
            "scans": [scan.to_dict(include_manifest=True) for scan in saved_scans],
        }
    ), 201


@advanced_bp.route("/ci/config", methods=["GET", "POST"])
@token_required
def ci_config():
    data = request.get_json(silent=True) or {}
    provider = (data.get("provider") or request.args.get("provider") or "github").lower()
    backend_url = (
        data.get("backend_url")
        or request.args.get("backend_url")
        or f"{current_app.config['BACKEND_URL']}/api"
    ).rstrip("/")
    risk_threshold = int(data.get("risk_threshold") or request.args.get("risk_threshold") or 70)
    yaml_content = generate_ci_yaml(provider, backend_url, risk_threshold)
    filename = "dependguard-ci.yml"

    if request.method == "POST":
        saved = CIConfig(
            user_id=g.current_user.id,
            provider=provider,
            project_name=data.get("project_name") or "DependGuard",
            yaml_content=yaml_content,
        )
        db.session.add(saved)
        db.session.commit()

    if request.args.get("download") == "true":
        return Response(
            yaml_content,
            mimetype="text/yaml",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    return jsonify(
        {
            "provider": provider,
            "filename": filename,
            "yaml": yaml_content,
            "instructions": [
                "Save this file in your repository CI folder.",
                "Create a DEPENDGUARD_TOKEN secret with a valid DependGuard JWT.",
                "Set DEPENDGUARD_API_URL if your backend is not running on the generated URL.",
            ],
        }
    )


@advanced_bp.get("/reports/pdf/<int:scan_id>")
@token_required
def pdf_report(scan_id):
    scan = _get_user_scan(scan_id)
    dependencies = parse_dependencies(scan.original_manifest, scan.manifest_type)
    license_findings = analyze_dependency_licenses(dependencies)
    supply_chain = calculate_supply_chain_score(dependencies, scan.findings or [], license_findings)
    pdf_bytes = generate_security_pdf(scan, license_findings, supply_chain)
    filename = f"dependguard-security-report-{scan.id}.pdf"

    generated_report = GeneratedReport(
        user_id=g.current_user.id,
        scan_id=scan.id,
        report_type="pdf",
        filename=filename,
        content_preview=f"PDF report for {scan.manifest_name} with {scan.vulnerability_count} findings.",
    )
    db.session.add(generated_report)
    db.session.commit()

    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@advanced_bp.post("/licenses/analyze")
@token_required
def analyze_licenses():
    scan, dependencies = _scan_or_manifest_dependencies()
    findings = analyze_dependency_licenses(dependencies)

    if scan:
        LicenseFinding.query.filter_by(user_id=g.current_user.id, scan_id=scan.id).delete()
        for item in findings:
            db.session.add(
                LicenseFinding(
                    user_id=g.current_user.id,
                    scan_id=scan.id,
                    package_name=item["package_name"],
                    version=item.get("version"),
                    license_name=item["license"],
                    risk_level=item["risk_level"],
                    reason=item["reason"],
                )
            )
        db.session.commit()

    risky_count = sum(1 for item in findings if item["risk_level"] in {"high", "review"})
    return jsonify(
        {
            "scan_id": scan.id if scan else None,
            "total_dependencies": len(findings),
            "risky_count": risky_count,
            "findings": findings,
        }
    )


@advanced_bp.post("/supply-chain/score")
@token_required
def supply_chain_score():
    scan, dependencies = _scan_or_manifest_dependencies()
    license_findings = analyze_dependency_licenses(dependencies)
    vulnerabilities = scan.findings if scan else []
    result = calculate_supply_chain_score(dependencies, vulnerabilities, license_findings)

    if scan:
        SupplyChainFinding.query.filter_by(user_id=g.current_user.id, scan_id=scan.id).delete()
        for item in result["findings"]:
            db.session.add(
                SupplyChainFinding(
                    user_id=g.current_user.id,
                    scan_id=scan.id,
                    package_name=item["package_name"],
                    version=item.get("version"),
                    score=item["score"],
                    risk_level=item["risk_level"],
                    reasons=item["reasons"],
                )
            )
        db.session.commit()

    return jsonify({"scan_id": scan.id if scan else None, **result})


@advanced_bp.get("/attack-graph/<int:scan_id>")
@token_required
def attack_graph(scan_id):
    scan = _get_user_scan(scan_id)
    return jsonify({"scan_id": scan.id, "graph": build_attack_graph(scan)})


@advanced_bp.post("/explain-vulnerability")
@token_required
def vulnerability_explanation():
    data = request.get_json(silent=True) or {}
    finding = data.get("finding") or data.get("vulnerability") or data
    if not finding:
        return jsonify({"message": "Provide vulnerability details to explain"}), 400
    return jsonify({"explanation": explain_vulnerability(finding)})


def _scan_or_manifest_dependencies():
    data = request.get_json(silent=True) or {}
    scan_id = data.get("scan_id")
    if scan_id:
        scan = _get_user_scan(int(scan_id))
        return scan, parse_dependencies(scan.original_manifest, scan.manifest_type)

    manifest_text = data.get("manifest_text") or ""
    manifest_type = data.get("manifest_type") or detect_manifest_type(data.get("filename") or "", manifest_text)
    if not manifest_text.strip():
        abort(400, description="scan_id or manifest_text is required")
    return None, parse_dependencies(manifest_text, manifest_type)


def _get_user_scan(scan_id):
    scan = db.session.get(Scan, scan_id)
    if not scan or scan.user_id != g.current_user.id:
        abort(404, description="Scan not found")
    return scan
