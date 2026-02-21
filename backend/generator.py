import json
import os
import re as _re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(BASE_DIR, "design_system.json")) as f:
    DESIGN_SYSTEM = json.load(f)

# Load system prompt from file
with open(os.path.join(BASE_DIR, "prompts", "generate_prompt.txt")) as f:
    SYSTEM_PROMPT = f.read().strip()

def build_generation_prompt(user_prompt: str) -> str:
    return f"""DESIGN SYSTEM (you must strictly follow these tokens):
{json.dumps(DESIGN_SYSTEM['tokens'], indent=2)}

ALLOWED COLORS ONLY: {DESIGN_SYSTEM['rules']['allowed_colors']}
REQUIRED FONT: {DESIGN_SYSTEM['rules']['required_font']}

USER REQUEST: {user_prompt}

Generate a complete Angular standalone component now."""

def _clean_output(text: str) -> str:
    """Strip markdown code fences by filtering out lines that start with ```."""
    lines = text.split('\n')
    cleaned_lines = [line for line in lines if not line.strip().startswith('```')]
    return '\n'.join(cleaned_lines).strip()

def generate_component(user_prompt: str, conversation_history: list = None) -> dict:
    if conversation_history is None:
        conversation_history = []

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *conversation_history,
        {"role": "user", "content": build_generation_prompt(user_prompt)}
    ]
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=4096,
        messages=messages
    )

    raw = response.choices[0].message.content
    cleaned = _clean_output(raw)

    # Strip backend autocorrect / log lines that may have been injected into the LLM output
    # Examples: "Attempt 1 failed...", "Auto-correcting...", any INFO: lines, or
    # explanatory parenthetical notes like "(no HTML is needed here...)" which confuse splitting.
    cleaned = _re.sub(r"(?m)^\s*(Attempt\s+\d+\s+failed.*|Auto-correcting\.*|INFO:.*)\s*$", "", cleaned)
    cleaned = _re.sub(r"(?i)\(no\s+html.*?\)", "", cleaned)
    
    # Robust splitting: check for case-insensitive separator with varied dashes/spacing
    sep_pattern = _re.compile(r'-{3,}\s*HTML\s*-{3,}', _re.IGNORECASE)
    parts = sep_pattern.split(cleaned, 1)
    
    if len(parts) == 2:
        ts_part, html_part = parts
    else:
        # Fallback: if separator is missing, try to split at the first HTML tag
        html_split = _re.search(r'<(div|section|button|nav|header|footer|a\b)', cleaned, _re.IGNORECASE)
        if html_split:
            ts_part = cleaned[:html_split.start()]
            html_part = cleaned[html_split.start():]
        else:
            ts_part, html_part = cleaned, ""

    # SMARTER EXTRACTION: Ignore any chat text before the code
    ts_match = _re.search(r'(import|@Component|export|import\s+\{)', ts_part, _re.IGNORECASE)
    ts_code = ts_part[ts_match.start():] if ts_match else ts_part

    html_match = _re.search(r'<', html_part)
    html_code = html_part[html_match.start():] if html_match else html_part

    # Remove any trailing "---" or "```" if found
    ts_code = _re.sub(r'\s*([-]{3,}|[`]{3,})\s*$', '', ts_code.strip())
    html_code = _re.sub(r'\s*([-]{3,}|[`]{3,})\s*$', '', html_code.strip())

    # If the model inlined the template inside the TypeScript (@Component({ template: `...` }))
    # and we don't have a separate HTML part, extract it into `html_code` so the frontend
    # can write a dedicated HTML file. Also convert the TS to reference `templateUrl: './app.component.html'`.
    tpl_match = _re.search(r"""template\s*:\s*(['\"`])([\s\S]*?)\1""", ts_code, _re.MULTILINE)
    if tpl_match and (not html_code or html_code.strip() == ""):
        extracted = tpl_match.group(2).strip()
        # Remove the inlined template property from the TS code
        ts_code = _re.sub(r",?\s*template\s*:\s*([`\'\"]).*?\1", "", ts_code, count=1, flags=_re.DOTALL)

        # Clean up possible leftover commas and whitespace inside the decorator object
        ts_code = _re.sub(r",\s*,", ",", ts_code)
        ts_code = _re.sub(r",\s*(\})", r"\1", ts_code)

        # Insert templateUrl if not already present
        if not _re.search(r"templateUrl\s*:\s*['\"]", ts_code):
            ts_code = _re.sub(r"(@Component\s*\(\s*\{)", r"\1\n  templateUrl: './app.component.html',", ts_code, count=1)

        html_code = extracted

    # Log raw response for debugging (visible in backend logs)
    try:
        print("LLM raw response:", raw)
    except Exception:
        pass

    # If the generated code uses ngModel, ensure FormsModule is imported and
    # included in the component `imports` so two-way binding compiles correctly.
    uses_ngmodel = bool(_re.search(r'\bngModel\b', ts_code)) or bool(_re.search(r'\bngModel\b', html_code)) or bool(_re.search(r'\bngModel\b', raw))

    if uses_ngmodel:
        # Add import for FormsModule if missing (try to place after CommonModule import)
        if "@angular/forms" not in ts_code:
            if "import { CommonModule } from '@angular/common';" in ts_code:
                ts_code = ts_code.replace("import { CommonModule } from '@angular/common';",
                                          "import { CommonModule } from '@angular/common';\nimport { FormsModule } from '@angular/forms';")
            else:
                ts_code = "import { FormsModule } from '@angular/forms';\n" + ts_code

        # Helper: add FormsModule into existing imports: [ ... ] if present
        def _add_to_imports(match):
            inner = match.group(1)
            if 'FormsModule' in inner:
                return match.group(0)
            new_inner = inner.strip()
            if new_inner == '':
                new = 'FormsModule'
            else:
                new = new_inner.rstrip() + ', FormsModule'
            return f"imports: [{new}]"

        if _re.search(r'imports\s*:\s*\[[^\]]*\]', ts_code):
            ts_code = _re.sub(r'imports\s*:\s*\[([^\]]*)\]', _add_to_imports, ts_code, count=1)
        else:
            # If no imports array in @Component, insert one after the opening object
            ts_code = _re.sub(r'(@Component\s*\(\s*\{)', r"\1\n  imports: [CommonModule, FormsModule],", ts_code, count=1)

        pass

    # Normalize any templateUrl the model may have emitted to the single file
    # name used by the frontend StackBlitz embed (`app.component.html`). This
    # prevents mismatches like `templateUrl: './login-page.component.html'`
    # while the frontend writes `app.component.html`.
    ts_code = _re.sub(r"templateUrl\s*:\s*['\"][^'\"]+['\"]", "templateUrl: './app.component.html'", ts_code)

    return {"ts": ts_code.strip(), "html": html_code.strip(), "raw": raw}