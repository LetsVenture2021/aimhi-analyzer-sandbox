from dataclasses import asdict
from dataclasses import dataclass
from typing import Any
from typing import Dict
from typing import Optional


@dataclass
class GithubCommitSuccess:
    status: str
    file: str
    commit: str
    changed: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class GithubCommitError:
    status: str = "error"
    code: str = "GITHUB_COMMIT_FAILED"
    message: str = "Commit rejected"
    retry: bool = True
    file: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
