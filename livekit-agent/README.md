# LiveKit AI Calling Worker

Python LiveKit Agents worker for NexaCRM outbound calls.

## 1) Install

```bash
cd livekit-agent
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 2) Configure

```bash
cp .env.example .env
# Fill LIVEKIT_* and OPENAI_API_KEY values
```

## 3) Run

```bash
python worker.py dev
```

## Expected metadata from backend dispatch

The backend dispatch sends JSON metadata with:

- `leadId`
- `leadName`
- `externalId`
- `script`
- `triggerSource`
- `webhookUrl`
- `webhookSecret` (optional)
- `metadata` (optional custom map)

## Webhook callback contract

At call completion the worker POSTs this payload to `webhookUrl`:

- `externalId`
- `leadId`
- `status`
- `outcome`
- `summary`
- `transcript`
- `metadata`

If `webhookSecret` is present, the worker sends header `X-Call-Agent-Secret`.
