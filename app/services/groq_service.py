import os
import json
import re
from typing import Optional

from groq import Groq


DEFAULT_MODEL = "openai/gpt-oss-120b"


def get_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not configured. Add it to your .env file."
        )
    return Groq(api_key=api_key)


def _load_prompt(template_name: str, variables: dict) -> str:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    prompt_path = os.path.join(base_dir, "prompts", f"{template_name}.txt")
    with open(prompt_path, "r", encoding="utf-8") as f:
        template = f.read()
    try:
        return template.format(**variables)
    except KeyError as exc:
        raise ValueError(f"Missing prompt variable: {exc}")


def _extract_json(text: str) -> Optional[dict]:
    """Extract the first JSON object/array from a Markdown code block or raw string."""
    code_block = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if code_block:
        candidate = code_block.group(1)
    else:
        candidate = text

    for pattern in (r"(\{[\s\S]*\})", r"(\[[\s\S]*\])"):
        match = re.search(pattern, candidate)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                continue
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        return None


def generate_text(template_name: str, variables: dict, temperature: float = 0.7) -> str:
    client = get_client()
    prompt = _load_prompt(template_name, variables)
    model = os.getenv("GROQ_MODEL", DEFAULT_MODEL)
    chat_completion = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model=model,
        temperature=temperature,
        max_tokens=4096,
    )
    return chat_completion.choices[0].message.content


def generate_json(template_name: str, variables: dict, temperature: float = 0.5) -> dict:
    raw = generate_text(template_name, variables, temperature)
    parsed = _extract_json(raw)
    if parsed is None:
        return {"raw": raw, "error": "Could not parse JSON from model response"}
    return parsed
