from flask import Blueprint, Response, abort, current_app, g, jsonify, request

from auth import token_required
from extensions import db
from models import GeneratedReport, LicenseFinding, RepositoryScan, Scan, SupplyChainFinding
from scanner import (
    build_report,
    calculate_risk_score,
    count_severities,
    detect_manifest_type,
    generate_safe_manifest,
    get_intelligence,
    parse_dependencies,
    scan_manifest,
)
from services.advanced_service import (
    analyze_dependency_licenses,
    build_attack_graph,
    calculate_supply_chain_score,
    explain_vulnerability,
)
from services.osv_service import fetch_vulnerabilities


scan_bp = Blueprint("scan", __name__, url_prefix="/api")


@scan_bp.get("/health")
def health():
    return jsonify({"status": "ok", "service": "DependGuard API"})


@scan_bp.post("/manifests/upload")
@token_required
def upload_manifest():
    manifest_text, filename = _read_manifest_payload()
    if not manifest_text.strip():
        return jsonify({"message": "Upload a manifest file or paste manifest text"}), 400

    manifest_type = detect_manifest_type(filename, manifest_text)
    return jsonify(
        {
            "filename": filename or manifest_type,
            "manifest_type": manifest_type,
            "manifest_text": manifest_text,
            "preview": manifest_text[:1200],
        }
    )


@scan_bp.post("/scan")
@scan_bp.post("/scans")
@token_required
def create_scan():
    manifest_text, filename = _read_manifest_payload()
    if not manifest_text.strip():
        return jsonify({"message": "Provide a dependency manifest before scanning"}), 400

    payload = request.get_json(silent=True) or {}
    config = payload.get("config") if request.is_json else request.form.get("config")
    if isinstance(config, str):
        config = {"raw": config}

    lookup = fetch_vulnerabilities if current_app.config["USE_LIVE_CVE"] else None
    result = scan_manifest(
        manifest_text,
        filename,
        config=config or {},
        vulnerability_lookup=lookup,
    )
    scan = Scan(
        user_id=g.current_user.id,
        manifest_name=result["manifest_name"],
        manifest_type=result["manifest_type"],
        original_manifest=manifest_text,
        safe_manifest=result["safe_manifest"],
        total_dependencies=result["total_dependencies"],
        vulnerability_count=result["vulnerability_count"],
        risk_score=result["risk_score"],
        severity_counts=result["severity_counts"],
        findings=result["findings"],
        config=result["config"],
    )
    db.session.add(scan)
    db.session.commit()
    return jsonify({"scan": scan.to_dict(include_manifest=True)}), 201


@scan_bp.post("/risk-score")
@token_required
def risk_score():
    data = request.get_json(silent=True) or {}
    findings = data.get("findings") or []
    total_dependencies = int(data.get("total_dependencies") or max(len(findings), 1))
    return jsonify(
        {
            "risk_score": calculate_risk_score(findings, total_dependencies),
            "severity_counts": count_severities(findings),
        }
    )


@scan_bp.get("/scans/history")
@token_required
def scan_history():
    scans = (
        Scan.query.filter_by(user_id=g.current_user.id)
        .order_by(Scan.created_at.desc())
        .all()
    )
    return jsonify({"scans": [scan.to_dict() for scan in scans]})


@scan_bp.delete("/history/<int:scan_id>")
@token_required
def delete_scan_history(scan_id):
    scan = _get_user_scan(scan_id)
    _delete_scan_records(g.current_user.id, [scan.id])
    db.session.commit()
    return jsonify({"message": "Scan history deleted successfully"})


@scan_bp.delete("/history")
@token_required
def clear_scan_history():
    scan_ids = [
        scan_id
        for (scan_id,) in db.session.query(Scan.id)
        .filter_by(user_id=g.current_user.id)
        .all()
    ]
    if scan_ids:
        _delete_scan_records(g.current_user.id, scan_ids)
        db.session.commit()
    return jsonify({"message": "Scan history deleted successfully"})


@scan_bp.get("/scans/<int:scan_id>")
@token_required
def get_scan(scan_id):
    scan = _get_user_scan(scan_id)
    return jsonify({"scan": scan.to_dict(include_manifest=True)})


@scan_bp.post("/manifests/safe")
@token_required
def safe_manifest():
    data = request.get_json(silent=True) or {}
    scan_id = data.get("scan_id")

    if scan_id:
        scan = _get_user_scan(int(scan_id))
        scan.safe_manifest = generate_safe_manifest(
            scan.original_manifest,
            scan.manifest_type,
            scan.findings or [],
        )
        db.session.commit()
        return jsonify(
            {
                "scan_id": scan.id,
                "original_manifest": scan.original_manifest,
                "safe_manifest": scan.safe_manifest,
            }
        )

    manifest_text = data.get("manifest_text") or ""
    manifest_type = data.get("manifest_type") or detect_manifest_type("", manifest_text)
    return jsonify(
        {
            "original_manifest": manifest_text,
            "safe_manifest": generate_safe_manifest(manifest_text, manifest_type),
        }
    )


@scan_bp.post("/reports")
@token_required
def create_report():
    data = request.get_json(silent=True) or {}
    if not data.get("scan_id"):
        return jsonify({"message": "scan_id is required"}), 400
    scan = _get_user_scan(int(data.get("scan_id")))
    report = build_report(scan)
    return jsonify({"scan_id": scan.id, "report_markdown": report})


@scan_bp.get("/reports/<int:scan_id>")
@token_required
def get_report(scan_id):
    scan = _get_user_scan(scan_id)
    report = build_report(scan)
    if request.args.get("download") == "true":
        return Response(
            report,
            mimetype="text/markdown",
            headers={
                "Content-Disposition": f"attachment; filename=dependguard-scan-{scan.id}.md"
            },
        )

    return jsonify(_build_detailed_report(scan, report))


@scan_bp.get("/intelligence")
@token_required
def intelligence():
    if current_app.config["USE_LIVE_CVE"]:
        return jsonify(
            {
                "mode": "live_osv",
                "items": [],
                "message": "Live OSV CVE intelligence enabled. Findings are fetched dynamically during each scan.",
            }
        )

    return jsonify(
        {
            "mode": "mock",
            "items": get_intelligence(),
            "message": "Mock CVE intelligence is enabled for local development.",
        }
    )


@scan_bp.get("/intelligence/status")
@token_required
def intelligence_status():
    live_enabled = current_app.config["USE_LIVE_CVE"]
    return jsonify(
        {
            "live_cve_enabled": live_enabled,
            "mode": "live_osv" if live_enabled else "mock",
            "message": (
                "Live OSV CVE intelligence enabled"
                if live_enabled
                else "Mock CVE intelligence is enabled for local development."
            ),
        }
    )


@scan_bp.get("/dashboard/summary")
@token_required
def dashboard_summary():
    scans = (
        Scan.query.filter_by(user_id=g.current_user.id)
        .order_by(Scan.created_at.desc())
        .all()
    )
    total_dependencies = sum(scan.total_dependencies or 0 for scan in scans)
    total_vulnerabilities = sum(scan.vulnerability_count or 0 for scan in scans)
    average_risk = round(
        sum(scan.risk_score or 0 for scan in scans) / max(len(scans), 1)
    )
    severity_totals = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    risk_distribution = {"low": 0, "medium": 0, "high": 0, "critical": 0}

    for scan in scans:
        for severity, count in (scan.severity_counts or {}).items():
            severity_totals[severity] = severity_totals.get(severity, 0) + count

        if scan.risk_score >= 75:
            risk_distribution["critical"] += 1
        elif scan.risk_score >= 50:
            risk_distribution["high"] += 1
        elif scan.risk_score >= 25:
            risk_distribution["medium"] += 1
        else:
            risk_distribution["low"] += 1

    return jsonify(
        {
            "security_score": max(0, 100 - average_risk),
            "total_dependencies": total_dependencies,
            "total_vulnerabilities": total_vulnerabilities,
            "total_scans": len(scans),
            "severity_totals": severity_totals,
            "risk_distribution": risk_distribution,
            "recent_scans": [scan.to_dict() for scan in scans[:5]],
        }
    )


def _read_manifest_payload():
    if "file" in request.files:
        uploaded_file = request.files["file"]
        raw = uploaded_file.read()
        return raw.decode("utf-8", errors="replace"), uploaded_file.filename

    data = request.get_json(silent=True) or {}
    if data:
        return data.get("manifest_text") or "", data.get("filename") or ""

    return request.form.get("manifest_text", ""), request.form.get("filename", "")


def _get_user_scan(scan_id):
    scan = db.session.get(Scan, scan_id)
    if not scan or scan.user_id != g.current_user.id:
        abort(404, description="Scan not found")
    return scan


def _delete_scan_records(user_id, scan_ids):
    """Delete scans and dependent records owned by the current user."""
    LicenseFinding.query.filter(
        LicenseFinding.user_id == user_id,
        LicenseFinding.scan_id.in_(scan_ids),
    ).delete(synchronize_session=False)
    SupplyChainFinding.query.filter(
        SupplyChainFinding.user_id == user_id,
        SupplyChainFinding.scan_id.in_(scan_ids),
    ).delete(synchronize_session=False)
    GeneratedReport.query.filter(
        GeneratedReport.user_id == user_id,
        GeneratedReport.scan_id.in_(scan_ids),
    ).delete(synchronize_session=False)

    _remove_deleted_scans_from_repository_records(user_id, scan_ids)

    Scan.query.filter(
        Scan.user_id == user_id,
        Scan.id.in_(scan_ids),
    ).delete(synchronize_session=False)


def _remove_deleted_scans_from_repository_records(user_id, scan_ids):
    scan_id_set = set(scan_ids)
    repository_scans = RepositoryScan.query.filter_by(user_id=user_id).all()
    for repository_scan in repository_scans:
        current_scan_ids = repository_scan.scan_ids or []
        next_scan_ids = [
            saved_scan_id
            for saved_scan_id in current_scan_ids
            if saved_scan_id not in scan_id_set
        ]
        if next_scan_ids == current_scan_ids:
            continue

        repository_scan.scan_ids = next_scan_ids
        if not next_scan_ids:
            repository_scan.status = "deleted"
            repository_scan.message = "All scan history for this repository scan was deleted."


def _build_detailed_report(scan, report_markdown):
    dependencies = parse_dependencies(scan.original_manifest, scan.manifest_type)
    license_findings = _license_findings_for_report(scan, dependencies)
    supply_chain = _supply_chain_for_report(scan, dependencies, license_findings)
    explanations = [
        {
            "finding_id": finding.get("id"),
            "package": finding.get("package"),
            "cve": finding.get("cve"),
            "explanation": explain_vulnerability(finding),
        }
        for finding in (scan.findings or [])
    ]

    return {
        "scan_id": scan.id,
        "scan": scan.to_dict(include_manifest=True),
        "report_markdown": report_markdown,
        "vulnerabilities": scan.findings or [],
        "vulnerability_summary": {
            "total": scan.vulnerability_count or 0,
            "severity_counts": scan.severity_counts or count_severities(scan.findings or []),
            "risk_score": scan.risk_score or 0,
            "security_score": max(0, 100 - (scan.risk_score or 0)),
        },
        "license_analysis": {
            "total_dependencies": len(license_findings),
            "risky_count": sum(
                1 for finding in license_findings if finding.get("risk_level") in {"high", "review"}
            ),
            "findings": license_findings,
        },
        "supply_chain": supply_chain,
        "safe_manifest": scan.safe_manifest or "",
        "ai_explanations": explanations,
        "attack_graph": build_attack_graph(scan),
    }


def _license_findings_for_report(scan, dependencies):
    stored_findings = LicenseFinding.query.filter_by(
        user_id=g.current_user.id,
        scan_id=scan.id,
    ).all()
    if stored_findings:
        return [finding.to_dict() for finding in stored_findings]
    return analyze_dependency_licenses(dependencies)


def _supply_chain_for_report(scan, dependencies, license_findings):
    stored_findings = SupplyChainFinding.query.filter_by(
        user_id=g.current_user.id,
        scan_id=scan.id,
    ).all()
    if not stored_findings:
        return calculate_supply_chain_score(dependencies, scan.findings or [], license_findings)

    findings = [finding.to_dict() for finding in stored_findings]
    overall_score = round(sum(item["score"] for item in findings) / max(len(findings), 1))
    return {
        "overall_score": overall_score,
        "overall_risk_level": _risk_level(overall_score),
        "findings": findings,
    }


def _risk_level(score):
    if score >= 75:
        return "critical"
    if score >= 55:
        return "high"
    if score >= 30:
        return "medium"
    return "low"
