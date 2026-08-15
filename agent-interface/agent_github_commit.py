import os
from pathlib import Path
from typing import Any
from typing import Dict
from typing import List

from github_api_client import GitHubApiError
from github_api_client import GithubApiClient
from github_commit_models import GithubCommitError
from github_commit_models import GithubCommitSuccess


SYNC_ROOT = "gcp-github-sync"
CATEGORY_DIRECTORIES = {
    "gcp_infrastructure": "infrastructure",
    "pipelines": "pipelines",
    "schemas": "schemas",
    "dashboards": "dashboards",
    "telemetry_emitters": "telemetry",
}


def commit_and_push(repo_path: str, file_path: str, content: str) -> Dict[str, Any]:
    secret_resource = os.environ.get("GITHUB_PAT_SECRET_RESOURCE", "").strip()
    branch = os.environ.get("GITHUB_TARGET_BRANCH", "main").strip() or "main"
    if not secret_resource:
        return GithubCommitError(message="Missing GITHUB_PAT_SECRET_RESOURCE", retry=False, file=file_path).to_dict()
    try:
        client = GithubApiClient.from_secret_manager(
            repo_path=repo_path,
            secret_version_resource=secret_resource,
            branch=branch,
        )
        current_file = client.get_file(file_path)
        if current_file.get("exists") and current_file.get("content") == content:
            return GithubCommitSuccess(status="ok", file=file_path, commit="", changed=False).to_dict()
        commit_message = f"Agent Sync Update: {file_path}"
        response = client.put_file(file_path=file_path, content=content, message=commit_message, sha=current_file.get("sha"))
        commit_sha = response.get("commit", {}).get("sha", "")
        return GithubCommitSuccess(status="ok", file=file_path, commit=commit_sha, changed=True).to_dict()
    except GitHubApiError as exc:
        return GithubCommitError(message="Commit rejected", retry=exc.retry, file=file_path).to_dict()
    except Exception:
        return GithubCommitError(message="Commit rejected", retry=True, file=file_path).to_dict()


def file_write_and_commit(file_path: str, content: str) -> Dict[str, Any]:
    repo_path = os.environ.get("GITHUB_REPOSITORY", "").strip()
    workspace_root = os.environ.get("AGENT_WORKSPACE_ROOT", os.getcwd())
    if not repo_path:
        return GithubCommitError(message="Missing GITHUB_REPOSITORY", retry=False, file=file_path).to_dict()
    absolute_path = Path(workspace_root).joinpath(file_path).resolve()
    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    absolute_path.write_text(content, encoding="utf-8")
    return commit_and_push(repo_path=repo_path, file_path=file_path, content=content)


def repo_sync_after_agent_action(action_result: Dict[str, Any]) -> Dict[str, Any]:
    results: List[Dict[str, Any]] = []
    sync_files = action_result.get("sync_files", [])
    for item in sync_files:
        category = str(item.get("category", ""))
        relative_file = str(item.get("file_path", "")).lstrip("/")
        content = str(item.get("content", ""))
        if not relative_file:
            continue
        category_dir = CATEGORY_DIRECTORIES.get(category, category.strip("/"))
        target_path = f"{SYNC_ROOT}/{category_dir}/{relative_file}" if category_dir else f"{SYNC_ROOT}/{relative_file}"
        results.append(file_write_and_commit(file_path=target_path, content=content))
    for category, category_dir in CATEGORY_DIRECTORIES.items():
        entries = action_result.get(category, {})
        if isinstance(entries, dict):
            for relative_file, content in entries.items():
                clean_path = str(relative_file).lstrip("/")
                target_path = f"{SYNC_ROOT}/{category_dir}/{clean_path}"
                results.append(file_write_and_commit(file_path=target_path, content=str(content)))
    has_error = any(item.get("status") == "error" for item in results)
    if has_error:
        return GithubCommitError(message="Commit rejected", retry=True).to_dict()
    return {"status": "ok", "synced_files": len(results), "results": results}
