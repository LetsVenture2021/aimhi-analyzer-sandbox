import json
import os
from datetime import datetime, timezone


def emit_autonomy_event(request):
    payload = request.get_json(silent=True) or {}
    event = {
        "event_id": payload.get("event_id", "manual-event"),
        "event_ts": datetime.now(timezone.utc).isoformat(),
        "pipeline": payload.get("pipeline", "autonomy-master"),
        "status": payload.get("status", "ok"),
        "service": payload.get("service", "autonomy-emitter"),
        "region": os.getenv("REGION", "us-central1"),
        "commit_sha": payload.get("commit_sha", os.getenv("GITHUB_SHA", "")),
        "metadata_json": payload.get("metadata_json", {}),
    }
    return (json.dumps(event), 200, {"Content-Type": "application/json"})
