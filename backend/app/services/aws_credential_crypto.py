"""Fernet encryption for saved AWS access keys. Never stores plaintext."""
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException

from app.config import settings

MISSING_KEY_DETAIL = (
    "AWS connection encryption is not configured. Set AWS_CONNECTION_ENCRYPTION_KEY "
    "to a Fernet key (python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"). "
    "Credentials were not stored."
)
INVALID_KEY_DETAIL = (
    "AWS_CONNECTION_ENCRYPTION_KEY is invalid. It must be a Fernet key from "
    "cryptography.fernet.Fernet.generate_key(). Credentials were not stored."
)
DECRYPT_DETAIL = (
    "Could not decrypt a saved AWS credential. The AWS_CONNECTION_ENCRYPTION_KEY "
    "on this backend does not match the key used when the connection was saved."
)


def _fernet() -> Fernet:
    raw = (settings.AWS_CONNECTION_ENCRYPTION_KEY or "").strip()
    if not raw:
        raise HTTPException(status_code=503, detail=MISSING_KEY_DETAIL)
    try:
        key = raw.encode("utf-8")
        return Fernet(key)
    except Exception:
        raise HTTPException(status_code=503, detail=INVALID_KEY_DETAIL) from None


def encrypt_secret(value: str) -> str:
    return _fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_secret(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        raise HTTPException(status_code=503, detail=DECRYPT_DETAIL) from None
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail=INVALID_KEY_DETAIL) from None
