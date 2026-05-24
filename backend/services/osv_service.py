from datetime import datetime, timedelta
import re

import requests
from flask import current_app

from extensions import db
from models import OsvCache


def fetch_vulnerabilities(package_name, version, ecosystem):
    """Fetch vulnerability data from OSV with a 24-hour database cache."""
    package_name = (package_name or "").strip()
    version = (version or "").strip()
    ecosystem = (ecosystem or "").strip()

    if not package_name or not version or version == "unknown" or not ecosystem:
        return {"vulnerabilities": [], "warning": None, "from_cache": False}

    cache_ttl = timedelta(hours=current_app.config["OSV_CACHE_HOURS"])
    cached_response = _get_cached_response(package_name, version, ecosystem, cache_ttl)
    if cached_response is not None:
        return {
            "vulnerabilities": _parse_osv_response(cached_response, package_name, version, ecosystem),
            "warning": None,
            "from_cache": True,
        }

    payload = {
        "package": {
            "name": package_name,
            "ecosystem": ecosystem,
        },
        "version": version,
    }

    try:
        response = requests.post(
            current_app.config["OSV_API_URL"],
            json=payload,
            timeout=current_app.config["OSV_TIMEOUT_SECONDS"],
        )
        response.raise_for_status()
        response_json = response.json()
    except (requests.RequestException, ValueError):
        return {
            "vulnerabilities": [],
            "warning": "Live CVE lookup failed",
            "from_cache": False,
        }

    _save_cached_response(package_name, version, ecosystem, response_json)
    return {
        "vulnerabilities": _parse_osv_response(response_json, package_name, version, ecosystem),
        "warning": None,
        "from_cache": False,
    }


def _get_cached_response(package_name, version, ecosystem, cache_ttl):
    cache_entry = OsvCache.query.filter_by(
        package_name=package_name.lower(),
        version=version,
        ecosystem=ecosystem,
    ).first()

    if cache_entry and cache_entry.is_fresh(cache_ttl):
        return cache_entry.api_response

    return None


def _save_cached_response(package_name, version, ecosystem, response_json):
    cache_entry = OsvCache.query.filter_by(
        package_name=package_name.lower(),
        version=version,
        ecosystem=ecosystem,
    ).first()

    if not cache_entry:
        cache_entry = OsvCache(
            package_name=package_name.lower(),
            version=version,
            ecosystem=ecosystem,
            api_response=response_json,
        )
        db.session.add(cache_entry)
    else:
        cache_entry.api_response = response_json
        cache_entry.scanned_at = datetime.utcnow()

    db.session.commit()


def _parse_osv_response(response_json, package_name, version, ecosystem):
    vulnerabilities = []
    for vuln in response_json.get("vulns", []):
        affected_package = _get_affected_package(vuln, package_name, ecosystem)
        fixed_versions = _get_fixed_versions(vuln, package_name, ecosystem)
        cvss_score, cvss_vector = _get_cvss(vuln)
        severity = _get_severity(vuln, cvss_score)
        osv_id = vuln.get("id", "OSV-UNKNOWN")
        aliases = vuln.get("aliases") or []

        vulnerabilities.append(
            {
                "id": osv_id,
                "vulnerability_id": osv_id,
                "package": package_name,
                "affected_package": affected_package,
                "current_version": version,
                "safe_version": fixed_versions[0] if fixed_versions else "No fixed version listed",
                "fixed_versions": fixed_versions,
                "severity": severity,
                "cvss_score": cvss_score,
                "cvss_vector": cvss_vector,
                "cve": _first_cve(aliases) or osv_id,
                "aliases": aliases,
                "summary": vuln.get("summary") or "OSV vulnerability match",
                "details": vuln.get("details") or "",
                "explanation": vuln.get("details") or vuln.get("summary") or "",
                "fix": _build_fix(package_name, fixed_versions),
                "ecosystem": ecosystem,
                "references": vuln.get("references") or [],
                "source": "OSV",
            }
        )
    return vulnerabilities


def _get_affected_package(vuln, package_name, ecosystem):
    for affected in vuln.get("affected", []):
        package = affected.get("package") or {}
        if _same_package(package, package_name, ecosystem):
            return {
                "name": package.get("name") or package_name,
                "ecosystem": package.get("ecosystem") or ecosystem,
            }
    return {"name": package_name, "ecosystem": ecosystem}


def _get_fixed_versions(vuln, package_name, ecosystem):
    fixed_versions = []
    for affected in vuln.get("affected", []):
        package = affected.get("package") or {}
        if not _same_package(package, package_name, ecosystem):
            continue

        for affected_range in affected.get("ranges", []):
            for event in affected_range.get("events", []):
                fixed_version = event.get("fixed")
                if fixed_version and fixed_version not in fixed_versions:
                    fixed_versions.append(fixed_version)
    return fixed_versions


def _same_package(package, package_name, ecosystem):
    return (
        (package.get("name") or "").lower() == package_name.lower()
        and (package.get("ecosystem") or ecosystem) == ecosystem
    )


def _first_cve(aliases):
    for alias in aliases:
        if alias.upper().startswith("CVE-"):
            return alias
    return None


def _get_cvss(vuln):
    for item in vuln.get("severity") or []:
        score = item.get("score")
        if not score:
            continue
        numeric_score = _extract_numeric_score(score)
        return numeric_score, score

    database_specific = vuln.get("database_specific") or {}
    cvss_score = database_specific.get("cvss_score") or database_specific.get("cvss")
    if cvss_score:
        return _extract_numeric_score(str(cvss_score)), str(cvss_score)

    return None, None


def _extract_numeric_score(score):
    if isinstance(score, (int, float)):
        return float(score)

    match = re.search(r"\b(10(?:\.0)?|[0-9](?:\.[0-9])?)\b", str(score))
    return float(match.group(1)) if match else None


def _get_severity(vuln, cvss_score):
    for source in (
        vuln.get("database_specific") or {},
        vuln.get("ecosystem_specific") or {},
    ):
        severity = _normalize_severity(source.get("severity"))
        if severity:
            return severity

    if cvss_score is not None:
        if cvss_score >= 9:
            return "critical"
        if cvss_score >= 7:
            return "high"
        if cvss_score >= 4:
            return "medium"
        return "low"

    return "low"


def _normalize_severity(value):
    if not value:
        return None

    severity = str(value).lower()
    if severity in {"critical", "high", "medium", "low"}:
        return severity
    if severity == "moderate":
        return "medium"
    return None


def _build_fix(package_name, fixed_versions):
    if fixed_versions:
        return f"Upgrade {package_name} to {fixed_versions[0]} or newer."
    return "Review the OSV references and vendor advisory for remediation guidance."
