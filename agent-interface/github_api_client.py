import base64
import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any
from typing import Dict
from typing import Optional
from typing import Tuple


GITHUB_API_BASE = "https://api.github.com"
GCP_METADATA_TOKEN_URL = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"
SECRET_MANAGER_API_BASE = "https://secretmanager.googleapis.com/v1"


@dataclass
class GitHubApiError(Exception):
    status_code: int
    message: str
    retry: bool = True


def parse_repo_path(repo_path: str) -> Tuple[str, str]:
    parts = repo_path.strip("/").split("/")
    if len(parts) != 2:
        raise ValueError("repo_path must be in owner/repo format")
    return parts[0], parts[1]


def fetch_gcp_access_token(timeout: int = 10) -> str:
    request = urllib.request.Request(
        GCP_METADATA_TOKEN_URL,
        headers={"Metadata-Flavor": "Google"},
        method="GET",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        payload = json.loads(response.read().decode("utf-8"))
    token = payload.get("access_token")
    if not token:
        raise GitHubApiError(status_code=401, message="Unable to obtain GCP access token", retry=True)
    return token


def fetch_github_pat_from_secret_manager(secret_version_resource: str, gcp_access_token: Optional[str] = None) -> str:
    if not gcp_access_token:
        gcp_access_token = fetch_gcp_access_token()
    resource = secret_version_resource.lstrip("/")
    url = f"{SECRET_MANAGER_API_BASE}/{resource}:access"
    request = urllib.request.Request(
        url,
        headers={"Authorization": "Bearer " + gcp_access_token},
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise GitHubApiError(status_code=exc.code, message=f"Secret Manager access failed: {body}", retry=True) from exc
    data = payload.get("payload", {}).get("data", "")
    if not data:
        raise GitHubApiError(status_code=404, message="Secret payload is empty", retry=False)
    token = base64.b64decode(data).decode("utf-8").strip()
    if not token:
        raise GitHubApiError(status_code=404, message="Decoded GitHub token is empty", retry=False)
    return token


class GithubApiClient:
    def __init__(self, owner: str, repo: str, token: str, branch: str = "main", api_base: str = GITHUB_API_BASE):
        self.owner = owner
        self.repo = repo
        self.branch = branch
        self.api_base = api_base.rstrip("/")
        self._headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": "Bearer " + token,
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
        }

    @classmethod
    def from_secret_manager(
        cls,
        repo_path: str,
        secret_version_resource: str,
        branch: str = "main",
        gcp_access_token: Optional[str] = None,
    ) -> "GithubApiClient":
        owner, repo = parse_repo_path(repo_path)
        token = fetch_github_pat_from_secret_manager(secret_version_resource, gcp_access_token=gcp_access_token)
        return cls(owner=owner, repo=repo, token=token, branch=branch)

    def _request(self, method: str, path: str, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = f"{self.api_base}{path}"
        raw_body = None
        if body is not None:
            raw_body = json.dumps(body).encode("utf-8")
        request = urllib.request.Request(url, data=raw_body, headers=self._headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                response_body = response.read()
        except urllib.error.HTTPError as exc:
            response_body = exc.read().decode("utf-8", errors="replace")
            raise GitHubApiError(status_code=exc.code, message=response_body, retry=exc.code >= 500) from exc
        if not response_body:
            return {}
        return json.loads(response_body.decode("utf-8"))

    def get_file(self, file_path: str) -> Dict[str, Any]:
        encoded_path = urllib.parse.quote(file_path.lstrip("/"), safe="/")
        path = f"/repos/{self.owner}/{self.repo}/contents/{encoded_path}?ref={urllib.parse.quote(self.branch)}"
        try:
            payload = self._request("GET", path)
        except GitHubApiError as exc:
            if exc.status_code == 404:
                return {"exists": False, "sha": None, "content": None}
            raise
        encoded_content = payload.get("content", "").replace("\n", "")
        decoded_content = base64.b64decode(encoded_content).decode("utf-8") if encoded_content else ""
        return {"exists": True, "sha": payload.get("sha"), "content": decoded_content}

    def put_file(self, file_path: str, content: str, message: str, sha: Optional[str] = None) -> Dict[str, Any]:
        encoded_path = urllib.parse.quote(file_path.lstrip("/"), safe="/")
        path = f"/repos/{self.owner}/{self.repo}/contents/{encoded_path}"
        payload: Dict[str, Any] = {
            "message": message,
            "branch": self.branch,
            "content": base64.b64encode(content.encode("utf-8")).decode("utf-8"),
        }
        if sha:
            payload["sha"] = sha
        return self._request("PUT", path, body=payload)
