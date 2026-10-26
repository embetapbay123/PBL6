"""Run real M1/M2/M3/M4 recovery and privacy checks in a private Compose project.

Never reads infrastructure/.env, publishes a port, calls a bank, or uses demo volumes.
Requires Docker Compose and Node.js. Only evidence/report.json is safe to publish.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
PHASES = ("payment", "rollback-prepare", "rollback-recover", "expiry", "multistore", "authorization", "tracking", "chat")


def source_digest() -> str:
    paths = subprocess.check_output(["git", "ls-files", "--cached", "--others", "--exclude-standard",
                                     "backend", "scripts/run_cross_service_acceptance.py"], cwd=ROOT).splitlines()
    digest = hashlib.sha256()
    for raw in sorted(set(paths)):
        path = ROOT / raw.decode("utf-8")
        if path.is_file():
            digest.update(raw + b"\0" + path.read_bytes() + b"\0")
    return digest.hexdigest()


def make_config(project: str, folder: Path) -> dict:
    if not re.fullmatch(r"pbl6-acceptance-[a-f0-9]{12}", project):
        raise ValueError("Invalid isolated project name")
    values = {name: secrets.token_hex(24) for name in (
        "POSTGRES_PASSWORD", "M1_DB_PASSWORD", "M2_DB_PASSWORD", "M3_DB_PASSWORD",
        "M4_DB_PASSWORD", "M1_INTERNAL_KEY", "M2_INTERNAL_KEY", "M3_INTERNAL_KEY",
        "M4_INTERNAL_KEY", "RABBIT_PASSWORD", "SEED_PASSWORD", "SEPAY_WEBHOOK_SECRET",
        "ACCEPTANCE_CONTROL_KEY")}
    common = {key: value for key, value in values.items()
              if key.endswith("INTERNAL_KEY") or key in (
                  "SEED_PASSWORD", "SEPAY_WEBHOOK_SECRET", "ACCEPTANCE_CONTROL_KEY")}
    common.update({
        "NODE_ENV": "development", "PBL6_ACCEPTANCE_ISOLATED": "1",
        "EMAIL_ADAPTER": "mock",
        "ACCEPTANCE_RUN_ID": project, "WEB_ORIGIN": "http://acceptance.invalid",
        "COOKIE_SECURE": "false", "REDIS_URL": "redis://redis:6379",
        "RABBITMQ_URL": f"amqp://pbl6:{values['RABBIT_PASSWORD']}@rabbitmq:5672",
        "IDENTITY_URL": "http://m3:3103", "CATALOG_URL": "http://inventory-fault:3111",
        "JWT_PUBLIC_KEY_FILE": "/run/secrets/jwt-public.pem",
        "PAYMENT_PROVIDER_MODE": "sepay_test", "SEPAY_TEST_ACCOUNT": "0000000000",
        "SEPAY_TEST_BANK": "MBBank", "REFUND_PROVIDER": "disabled",
    })
    database_urls = {f"M{index}_DATABASE_URL":
        f"postgresql://m{index}:{values[f'M{index}_DB_PASSWORD']}@postgres:5432/m{index}"
        for index in range(1, 5)}
    public_key = f"{(folder / 'jwt-public.pem').as_posix()}:/run/secrets/jwt-public.pem:ro"
    node = {"image": f"{project}-node:local", "build": {
        "context": ROOT.as_posix(), "dockerfile": "backend/Dockerfile"},
        "volumes": [public_key], "restart": "no"}

    def service(service_id: str, command: list[str]) -> dict:
        database_key = service_id + "_DATABASE_URL"
        return {**node, "environment": {**common, "SERVICE_ID": service_id,
                                        database_key: database_urls[database_key]}, "command": command}

    services = {
        "postgres": {"image": "pgvector/pgvector:0.8.0-pg16", "environment": {
            "POSTGRES_USER": "postgres", **{k: v for k, v in values.items()
                                             if k.endswith("DB_PASSWORD") or k == "POSTGRES_PASSWORD"}},
            "volumes": ["pgdata:/var/lib/postgresql/data",
                        f"{(ROOT / 'infrastructure/init-databases.sh').as_posix()}:/docker-entrypoint-initdb.d/01-databases.sh:ro"],
            "healthcheck": {"test": ["CMD-SHELL", "pg_isready -h 127.0.0.1 -U postgres"],
                            "interval": "2s", "timeout": "3s", "retries": 60}},
        "redis": {"image": "redis:7.4.2-alpine", "volumes": ["redisdata:/data"],
                  "healthcheck": {"test": ["CMD", "redis-cli", "ping"],
                                  "interval": "2s", "timeout": "3s", "retries": 60}},
        "rabbitmq": {"image": "rabbitmq:4.1.0-management", "environment": {
            "RABBITMQ_DEFAULT_USER": "pbl6", "RABBITMQ_DEFAULT_PASS": values["RABBIT_PASSWORD"]},
            "volumes": ["rabbitdata:/var/lib/rabbitmq"],
            "healthcheck": {"test": ["CMD", "rabbitmq-diagnostics", "-q", "ping"],
                            "interval": "3s", "timeout": "5s", "retries": 60}},
        "m1": service("M1", ["node", "dist/catalog-service/src/main.js"]),
        "m2": service("M2", ["node", "dist/commerce-service/src/main.js"]),
        "m3": service("M3", ["node", "dist/identity-store-service/src/main.js"]),
        "worker-m2": service("M2", ["node", "dist/shared/src/worker.js"]),
        "worker-m1": service("M1", ["node", "dist/shared/src/worker.js"]),
        "worker-m3": service("M3", ["node", "dist/shared/src/worker.js"]),
        "inventory-fault": service("M1", ["node", "tests/acceptance/inventory-fault.cjs"]),
        "tools": service("M3", ["node", "tests/acceptance/run.cjs"]),
    }
    for index in range(1, 4):
        services[f"m{index}"]["environment"]["PORT"] = str(3100 + index)
    services["m3"]["user"] = f"{os.getuid() if hasattr(os, 'getuid') else 1000}:{os.getgid() if hasattr(os, 'getgid') else 1000}"
    services["m3"]["environment"]["JWT_PRIVATE_KEY_FILE"] = "/run/secrets/jwt-private.pem"
    services["m3"]["volumes"] = [public_key,
        f"{(folder / 'jwt-private.pem').as_posix()}:/run/secrets/jwt-private.pem:ro"]
    services["tools"]["volumes"] = [public_key, f"{(folder / 'evidence').as_posix()}:/evidence"]
    services["tools"]["environment"].update(database_urls)
    del services["inventory-fault"]["environment"]["M1_DATABASE_URL"]
    ai = {"image": f"{project}-ai:local", "build": {
        "context": ROOT.as_posix(), "dockerfile": "backend/ai-service/Dockerfile"},
        "environment": {**common, "SERVICE_ID": "M4", "M4_DATABASE_URL": database_urls["M4_DATABASE_URL"],
                        "AI_MODE": "real", "CHAT_PROVIDER": "none"}, "restart": "no"}
    services["m4"] = ai
    services["worker-m4"] = {**ai, "command": ["python", "-m", "app.tracking.worker"]}
    # Compose creates only project-scoped resources. No host port, external volume or network.
    return {"name": project, "services": services,
            "volumes": {name: {} for name in ("pgdata", "redisdata", "rabbitdata")}}


def validate_config(config: dict, project: str) -> None:
    if config.get("name") != project or not re.fullmatch(r"pbl6-acceptance-[a-f0-9]{12}", project):
        raise ValueError("Refusing to operate on a non-acceptance project")
    if any(value for value in config["volumes"].values()):
        raise ValueError("External or explicitly named volumes are forbidden")
    if "networks" in config:
        raise ValueError("External networks are forbidden")
    for service in config["services"].values():
        if any(key in service for key in ("ports", "network_mode", "container_name", "privileged")):
            raise ValueError("Public ports, host networking and privileged containers are forbidden")


def main() -> int:
    project = "pbl6-acceptance-" + secrets.token_hex(6)
    folder = ROOT / "artifacts" / "acceptance" / project
    folder.mkdir(parents=True, mode=0o700)
    evidence = folder / "evidence"
    evidence.mkdir(mode=0o777)
    evidence.chmod(0o777)  # Only generated reports; containers never mount the private parent.
    subprocess.run(["node", "-e", "const f=require('fs'),c=require('crypto');"
        "const k=c.generateKeyPairSync('rsa',{modulusLength:2048,"
        "publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});"
        "f.writeFileSync('jwt-private.pem',k.privateKey,{mode:0o600});"
        "f.writeFileSync('jwt-public.pem',k.publicKey);"], cwd=folder, check=True)
    config = make_config(project, folder)
    validate_config(config, project)
    config_file = folder / "compose.private.json"
    config_file.write_text(json.dumps(config), encoding="utf-8")
    config_file.chmod(0o600)
    compose = ["docker", "compose", "--project-name", project, "-f", str(config_file)]
    revision = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    dirty = bool(subprocess.check_output(["git", "status", "--porcelain"], cwd=ROOT, text=True).strip())
    report = {"run_id": project, "revision": revision, "dirty": dirty, "source_sha256": source_digest(),
              "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
              "scope": "Private real M1/M2/M3/M4 HTTP, PostgreSQL and RabbitMQ; local callback; no model calls",
              "not_run": ["SePay dashboard delivery/bank transfer", "Refund provider execution",
                          "Real behavior dataset/model quality evaluation", "100-user NFR", "public gateway/UI/APK", "backup restore"],
              "status": "FAIL", "phases": []}

    with (folder / "docker.private.log").open("w", encoding="utf-8") as log:
        def run(label: str, *args: str, timeout: int = 300) -> None:
            print(label, flush=True)
            result = subprocess.run([*compose, *args], cwd=ROOT, stdout=log,
                                    stderr=subprocess.STDOUT, timeout=timeout)
            if result.returncode:
                raise RuntimeError(f"{label}: exit {result.returncode}; inspect local private log")

        try:
            run("Build the checked-out Node and AI backends", "build", "tools", "m4", timeout=900)
            run("Start isolated databases/queue", "up", "-d", "--wait", "postgres", "redis", "rabbitmq")
            run("Apply migrations", "run", "--rm", "tools", "node", "dist/shared/src/migrate.js")
            run("Seed only the isolated databases", "run", "--rm", "tools", "node", "dist/shared/src/seed.js")
            run("Start real services and event/recovery workers", "up", "-d", "m1", "m2", "m3", "m4",
                "inventory-fault", "worker-m1", "worker-m2", "worker-m3", "worker-m4")
            for phase in PHASES:
                if phase == "rollback-prepare":
                    run("Stop isolated recovery worker", "stop", "worker-m2")
                if phase == "rollback-recover":
                    run("Restart isolated recovery worker", "start", "worker-m2")
                if phase == "chat":
                    run("Build index from the isolated live Catalog", "exec", "-T", "m4", "python", "-m", "app.chat.retrieval")
                run(f"Acceptance: {phase}", "run", "--rm", "tools", "node", "tests/acceptance/run.cjs", phase)
                try:
                    result = json.loads((evidence / f"{phase}.json").read_text(encoding="utf-8"))
                except (OSError, ValueError) as error:
                    raise RuntimeError(f"Acceptance: {phase}: missing or incomplete result") from error
                if result.get("phase") != phase or result.get("status") != "PASS" or not result.get("checks"):
                    raise RuntimeError(f"Acceptance: {phase}: result did not pass")
            run("AI PostgreSQL consent/chat contract regressions", "exec", "-T", "m4", "python", "-m", "pytest",
                "-q", "-p", "no:cacheprovider", "tests/test_ai_runtime.py", "tests/test_consent_tracking.py")
            report["ai_regressions"] = "PASS"
            if source_digest() != report["source_sha256"]:
                raise RuntimeError("Backend source changed during acceptance; rerun the immutable candidate")
            report["status"] = "PASS"
        except (subprocess.TimeoutExpired, RuntimeError) as error:
            report["failure"] = str(error) if isinstance(error, RuntimeError) else "Docker phase timed out"
        finally:
            for result_file in sorted(evidence.glob("*.json")):
                if result_file.stem not in PHASES:
                    continue
                try:
                    result = json.loads(result_file.read_text(encoding="utf-8"))
                    report["phases"].append({**result, "sha256": hashlib.sha256(result_file.read_bytes()).hexdigest()})
                except (OSError, ValueError):
                    report["status"] = "FAIL"
                    report["failure"] = "Acceptance result is missing or incomplete"
            # Validate again immediately before destructive teardown. Never target the demo project.
            validate_config(config, project)
            try:
                run("Remove only isolated containers and volumes", "down", "--volumes", "--remove-orphans")
                # Unique acceptance tag only; never remove the shared demo image or base images.
                subprocess.run(["docker", "image", "rm", f"{project}-node:local", f"{project}-ai:local"], cwd=ROOT,
                               stdout=log, stderr=subprocess.STDOUT, timeout=60, check=False)
                report["cleanup"] = "PASS"
            except (subprocess.TimeoutExpired, RuntimeError):
                report["cleanup"] = "FAIL"
                report["status"] = "FAIL"
            (evidence / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"{report['status']}: {evidence / 'report.json'}", flush=True)
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
