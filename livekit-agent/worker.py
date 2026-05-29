import asyncio
import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv
from livekit.agents import Agent, AgentServer, AgentSession, JobContext, cli
from livekit.plugins import openai

# Ensure local .env values override any stale machine/user env vars.
load_dotenv(override=True)

DEFAULT_AGENT_NAME = os.getenv("LIVEKIT_AGENT_NAME", "nexacrm-caller")
DEFAULT_WEBHOOK_URL = os.getenv("NEXACRM_CALL_WEBHOOK_URL", "http://localhost:8080/api/calls/webhook")
MAX_CALL_SECONDS = int(os.getenv("NEXACRM_MAX_CALL_SECONDS", "900"))

server = AgentServer()


def _safe_json_loads(raw: str) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _extract_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        parts = [_extract_text(v) for v in value]
        return " ".join([p for p in parts if p]).strip()
    if isinstance(value, dict):
        for key in ("text", "value", "content", "transcript", "message"):
            text = _extract_text(value.get(key))
            if text:
                return text
        return ""

    text_attr = getattr(value, "text", None)
    if isinstance(text_attr, str) and text_attr.strip():
        return text_attr.strip()

    content_attr = getattr(value, "content", None)
    if content_attr is not None:
        text = _extract_text(content_attr)
        if text:
            return text

    transcript_attr = getattr(value, "transcript", None)
    if isinstance(transcript_attr, str) and transcript_attr.strip():
        return transcript_attr.strip()

    return ""


def _normalize_outcome(transcript: str) -> str:
    text = transcript.lower()
    if not text.strip():
        return "no_answer"

    voicemail_markers = [
        "voicemail",
        "leave a message",
        "record your message",
        "after the tone",
    ]
    if any(marker in text for marker in voicemail_markers):
        return "voicemail"

    negative_markers = [
        "not interested",
        "don't call",
        "do not call",
        "remove my number",
        "stop calling",
        "no thanks",
        "already have",
    ]
    if any(marker in text for marker in negative_markers):
        return "not_interested"

    hot_markers = [
        "send proposal",
        "schedule demo",
        "book a meeting",
        "lets proceed",
        "let us proceed",
        "interested",
        "price",
        "quotation",
        "quote",
    ]
    if any(marker in text for marker in hot_markers):
        return "hot"

    warm_markers = [
        "call me later",
        "busy right now",
        "next week",
        "next month",
        "share details",
        "send details",
    ]
    if any(marker in text for marker in warm_markers):
        return "warm"

    return "cold"


def _build_summary(transcript: str, lead_name: str) -> str:
    clean = re.sub(r"\s+", " ", transcript).strip()
    if not clean:
        return f"No conversation captured for {lead_name or 'lead'}."
    if len(clean) <= 280:
        return clean
    return clean[:277] + "..."


def _post_webhook(url: str, webhook_secret: str, payload: dict[str, Any]) -> None:
    body = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
    }
    if webhook_secret:
        headers["X-Call-Agent-Secret"] = webhook_secret

    request = urllib.request.Request(url=url, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(request, timeout=15) as response:  # noqa: S310
        _ = response.read()


def _build_llm(model: str):
    llm_cls = getattr(openai, "LLM", None)
    if llm_cls is not None:
        return llm_cls(model=model)
    responses = getattr(openai, "responses", None)
    if responses is not None and hasattr(responses, "LLM"):
        return responses.LLM(model=model)
    raise RuntimeError("LiveKit OpenAI LLM class not found. Update livekit-agents/openai plugin.")


@server.rtc_session(agent_name=DEFAULT_AGENT_NAME)
async def entrypoint(ctx: JobContext):
    raw_metadata = getattr(getattr(ctx, "job", None), "metadata", "")
    dispatch_metadata = _safe_json_loads(raw_metadata)

    lead_id = str(dispatch_metadata.get("leadId", "")).strip()
    lead_name = str(dispatch_metadata.get("leadName", "")).strip()
    external_id = str(dispatch_metadata.get("externalId", "")).strip()
    script = str(dispatch_metadata.get("script", "")).strip()
    trigger_source = str(dispatch_metadata.get("triggerSource", "manual")).strip()
    webhook_url = str(dispatch_metadata.get("webhookUrl", DEFAULT_WEBHOOK_URL)).strip() or DEFAULT_WEBHOOK_URL
    webhook_secret = str(dispatch_metadata.get("webhookSecret", "")).strip()

    transcript_lines: list[str] = []
    closed_event = asyncio.Event()
    callback_sent = False

    ctx.log_context_fields = {
        "room": ctx.room.name,
        "lead_id": lead_id,
        "trigger_source": trigger_source,
    }

    session = AgentSession(
        stt=openai.STT(model=os.getenv("NEXACRM_LIVEKIT_STT_MODEL", "gpt-4o-transcribe")),
        llm=_build_llm(os.getenv("NEXACRM_LIVEKIT_LLM_MODEL", "gpt-4.1-mini")),
        tts=openai.TTS(model=os.getenv("NEXACRM_LIVEKIT_TTS_MODEL", "gpt-4o-mini-tts")),
    )

    @session.on("user_input_transcribed")
    def on_user_transcript(event):
        is_final = bool(getattr(event, "is_final", False))
        text = str(getattr(event, "transcript", "")).strip()
        if is_final and text:
            transcript_lines.append(f"[customer] {text}")

    @session.on("conversation_item_added")
    def on_item(event):
        item = getattr(event, "item", None)
        role = str(getattr(item, "role", "")).strip().lower()
        if role not in {"assistant", "agent"}:
            return
        text = _extract_text(item)
        if text:
            transcript_lines.append(f"[agent] {text}")

    @session.on("close")
    def on_close(_event):
        closed_event.set()

    async def post_call_update(reason: str = ""):
        nonlocal callback_sent
        if callback_sent:
            return
        callback_sent = True

        transcript = "\n".join(transcript_lines).strip()
        outcome = _normalize_outcome(transcript)
        status = "COMPLETED" if outcome not in {"no_answer", "voicemail"} else "NO_ANSWER"

        payload = {
            "externalId": external_id or ctx.room.name,
            "leadId": lead_id,
            "status": status,
            "outcome": outcome,
            "summary": _build_summary(transcript, lead_name),
            "transcript": transcript,
            "metadata": {
                "leadName": lead_name,
                "roomName": ctx.room.name,
                "triggerSource": trigger_source,
                "workerAgent": DEFAULT_AGENT_NAME,
                "closedReason": reason,
                "completedAt": datetime.now(timezone.utc).isoformat(),
                "rawMetadata": dispatch_metadata,
            },
        }

        try:
            await asyncio.to_thread(_post_webhook, webhook_url, webhook_secret, payload)
            print(f"Posted call webhook for leadId={lead_id} externalId={payload['externalId']}")
        except urllib.error.HTTPError as exc:
            print(f"Webhook HTTP error {exc.code}: {exc.read().decode('utf-8', errors='ignore')}")
        except Exception as exc:
            print(f"Webhook post failed: {exc}")

    add_shutdown_callback = getattr(ctx, "add_shutdown_callback", None)
    if callable(add_shutdown_callback):
        add_shutdown_callback(post_call_update)

    await ctx.connect()

    instructions = script or (
        "You are NexaCRM's outbound sales assistant. "
        "Start with a warm greeting, confirm if this is a good time, qualify interest, "
        "handle objections politely, and close with a clear next step. "
        "If this appears to be voicemail, leave a short callback message and end."
    )

    await session.start(
        room=ctx.room,
        agent=Agent(instructions=instructions),
    )

    await session.generate_reply(
        instructions="Greet the lead naturally, then ask one qualifying question and wait for their response."
    )

    try:
        await asyncio.wait_for(closed_event.wait(), timeout=MAX_CALL_SECONDS)
    except asyncio.TimeoutError:
        session.shutdown(drain=True)
    finally:
        await post_call_update("session_closed")


if __name__ == "__main__":
    cli.run_app(server)
