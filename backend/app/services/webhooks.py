from __future__ import annotations

import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def send_slack_notification(title: str, message: str, link: str | None = None) -> None:
    settings = get_settings()
    if not settings.webhook_notifications_enabled or not settings.slack_webhook_url:
        return

    text = f"*{title}*\n{message}"
    if link:
        text += f"\n<{link}|Open in ConnectX Scripts>"

    payload = {"text": text}

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(settings.slack_webhook_url, json=payload)
            resp.raise_for_status()
    except Exception as exc:
        logger.warning("Slack webhook failed: %s", exc)


def notify_external(title: str, message: str, link: str | None = None) -> None:
    send_slack_notification(title, message, link)
