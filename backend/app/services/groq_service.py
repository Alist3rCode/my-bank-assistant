from groq import Groq
from app.core.config import settings

_client: Groq | None = None


def get_groq_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


def chat(messages: list[dict], model: str | None = None, temperature: float = 0.3, max_tokens: int = 1024) -> str:
    client = get_groq_client()
    response = client.chat.completions.create(
        model=model or settings.GROQ_MODEL_SMART,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content


def chat_fast(messages: list[dict], temperature: float = 0.1, max_tokens: int = 512) -> str:
    return chat(messages, model=settings.GROQ_MODEL_FAST, temperature=temperature, max_tokens=max_tokens)
