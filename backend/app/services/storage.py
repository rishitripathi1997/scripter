from __future__ import annotations

import json
from abc import ABC, abstractmethod
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

from app.core.config import get_settings


class StorageBackend(ABC):
    @abstractmethod
    def put_text(self, key: str, content: str, content_type: str = "text/plain") -> None:
        raise NotImplementedError

    @abstractmethod
    def get_text(self, key: str) -> str:
        raise NotImplementedError

    @abstractmethod
    def put_bytes(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
        raise NotImplementedError


class LocalStorageBackend(StorageBackend):
    def __init__(self, base_path: str) -> None:
        self.base = Path(base_path)
        self.base.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        safe = key.lstrip("/")
        path = self.base / safe
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    def put_text(self, key: str, content: str, content_type: str = "text/plain") -> None:
        self._path(key).write_text(content, encoding="utf-8")

    def get_text(self, key: str) -> str:
        path = self._path(key)
        if not path.exists():
            raise FileNotFoundError(key)
        return path.read_text(encoding="utf-8")

    def put_bytes(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
        self._path(key).write_bytes(data)


class S3StorageBackend(StorageBackend):
    def __init__(self, bucket: str, region: str, endpoint_url: str | None = None) -> None:
        self.bucket = bucket
        kwargs: dict = {"region_name": region}
        if endpoint_url:
            kwargs["endpoint_url"] = endpoint_url
        self.client = boto3.client("s3", **kwargs)

    def put_text(self, key: str, content: str, content_type: str = "text/plain") -> None:
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=content.encode("utf-8"),
            ContentType=content_type,
        )

    def get_text(self, key: str) -> str:
        try:
            resp = self.client.get_object(Bucket=self.bucket, Key=key)
        except ClientError as e:
            if e.response["Error"]["Code"] in ("NoSuchKey", "404"):
                raise FileNotFoundError(key) from e
            raise
        return resp["Body"].read().decode("utf-8")

    def put_bytes(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )


def get_storage() -> StorageBackend:
    settings = get_settings()
    if settings.s3_bucket:
        return S3StorageBackend(
            bucket=settings.s3_bucket,
            region=settings.aws_region,
            endpoint_url=settings.s3_endpoint_url,
        )
    return LocalStorageBackend(settings.local_storage_path)


def script_object_key(script_id: str, version: int, filename: str = "main.py") -> str:
    return f"scripts/{script_id}/v{version}/{filename}"


def run_log_key(run_id: str, stream: str) -> str:
    return f"runs/{run_id}/{stream}.log"


def publish_script_version(
    script_id: str,
    version: int,
    script_content: str,
    manifest: dict,
) -> str:
    storage = get_storage()
    script_key = script_object_key(script_id, version, "main.py")
    manifest_key = script_object_key(script_id, version, "manifest.json")
    storage.put_text(script_key, script_content, content_type="text/x-python")
    storage.put_text(manifest_key, json.dumps(manifest, indent=2), content_type="application/json")
    return script_key
