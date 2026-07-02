import base64
import hashlib
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import get_settings


def _derive_key(master_key: str, user_id: str, credential_key: str) -> bytes:
    material = f"{master_key}:{user_id}:{credential_key}".encode()
    return hashlib.sha256(material).digest()


def encrypt_credential(user_id: str, credential_key: str, plaintext: str) -> str:
    settings = get_settings()
    key = _derive_key(settings.app_encryption_key, user_id, credential_key)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce + ciphertext).decode("ascii")


def decrypt_credential(user_id: str, credential_key: str, encoded: str) -> str:
    settings = get_settings()
    key = _derive_key(settings.app_encryption_key, user_id, credential_key)
    raw = base64.b64decode(encoded.encode("ascii"))
    nonce, ciphertext = raw[:12], raw[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, None).decode("utf-8")


def mask_secret(value: str) -> str:
    if len(value) <= 4:
        return "••••"
    return f"{'•' * 8}{value[-4:]}"
