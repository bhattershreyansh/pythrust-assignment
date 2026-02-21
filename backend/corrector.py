import json
import os
import re
from generator import client, SYSTEM_PROMPT, DESIGN_SYSTEM, _clean_output
from validator import validate_component
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MAX_RETRIES = 2

# Load correction prompt from file
with open(os.path.join(BASE_DIR, "prompts", "corrector_prompt.txt")) as f:
    CORRECTION_PROMPT = f.read().strip()

def generate_with_correction(user_prompt: str, generator_fn, conversation_history: list = None) -> dict:
    # Fix mutable default argument
    if conversation_history is None:
        conversation_history = []

    # Pass conversation_history to generator so multi-turn context is preserved
    result = generator_fn(user_prompt, conversation_history)
    validation = validate_component(result)

    attempts = [{"attempt": 1, "code": result, "validation": validation}]

    for attempt in range(MAX_RETRIES):
        if validation["valid"]:
            break

        print(f"Attempt {attempt + 1} failed. Errors: {validation['errors']}")
        print("Auto-correcting...")

        # Self-correction call
        correction_message = CORRECTION_PROMPT.format(
            errors="\n".join(f"- {e}" for e in validation["errors"]),
            original_code=result["raw"],
            design_system=json.dumps(DESIGN_SYSTEM["tokens"], indent=2)
        )

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=4096,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": correction_message}
            ]
        )

        raw = response.choices[0].message.content
        cleaned = _clean_output(raw)
        normalised = re.sub(r'---\s*HTML\s*---', '---HTML---', cleaned)

        if "---HTML---" in normalised:
            ts_part, html_part = normalised.split("---HTML---", 1)
        else:
            ts_part, html_part = normalised, result["html"]

        # SMARTER EXTRACTION: Ignore any chat text before the code
        ts_match = re.search(r'(import|@Component|export|import\s+\{)', ts_part, re.IGNORECASE)
        ts_code = ts_part[ts_match.start():] if ts_match else ts_part

        html_match = re.search(r'<', html_part)
        html_code = html_part[html_match.start():] if html_match else html_part

        # Remove any trailing "---" or "```" if found
        ts_code = re.sub(r'\s*([-]{3,}|[`]{3,})\s*$', '', ts_code.strip())
        html_code = re.sub(r'\s*([-]{3,}|[`]{3,})\s*$', '', html_code.strip())

        result = {"ts": ts_code.strip(), "html": html_code.strip(), "raw": raw}
        validation = validate_component(result)
        attempts.append({"attempt": attempt + 2, "code": result, "validation": validation})

    return {
        "final_code": result,
        "validation": validation,
        "attempts": len(attempts),
        "success": validation["valid"]
    }