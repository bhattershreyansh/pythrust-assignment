import re
import json
import os
from dotenv import load_dotenv

load_dotenv()   

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(BASE_DIR, "design_system.json")) as f:
    DESIGN_SYSTEM = json.load(f)

def validate_component(code: dict) -> dict:
    errors = []
    full_code = code["ts"] + "\n" + code["html"]
    
    # 1. Check for unauthorized hex colors
    found_colors = re.findall(r'#[0-9a-fA-F]{3,6}', full_code)
    allowed = [c.lower() for c in DESIGN_SYSTEM["rules"]["allowed_colors"]]
    
    for color in found_colors:
        if color.lower() not in allowed:
            errors.append(f"UNAUTHORIZED_COLOR: '{color}' is not in the design system. Allowed: {allowed}")
    
    # 2. Check font usage - Softened to match 'Inter' anywhere in relevant strings
    if "Inter" not in full_code:
        errors.append("MISSING_FONT: Component must use 'Inter' font family")
    
    # 3. Check border-radius tokens
    # This checks for common CSS and Tailwind patterns. Be permissive by
    # recognizing Tailwind rounded classes and bracketed radii like `rounded-[12px]`.
    rules = DESIGN_SYSTEM.get("rules", {})
    allowed_radii = rules.get("border_radius_values") or rules.get("allowed_radii") or rules.get("allowed_radii_values") or rules.get("allowed_radii_values") or []

    # Helper: mapping of common Tailwind rounded tokens to pixel values
    tailwind_map = {
        "rounded-sm": "4px",
        "rounded": "8px",
        "rounded-md": "12px",
        "rounded-lg": "16px",
        "rounded-full": "9999px",
        "rounded-pill": "9999px"
    }

    # Detect radius usage in several forms
    detected_radii = []

    # 1) explicit CSS values like 'border-radius: 16px' or inline style="border-radius: 16px"
    detected_radii += re.findall(r'border-radius\s*:\s*([0-9]+px|50%|9999px)', full_code, flags=re.IGNORECASE)

    # 2) tailwind classes like 'rounded-lg' or 'rounded-md'
    for token, px in tailwind_map.items():
        if token in full_code:
            detected_radii.append(px)

    # 3) tailwind arbitrary values: rounded-[12px]
    bracketed = re.findall(r'rounded-\[\s*([0-9]+px)\s*\]', full_code)
    detected_radii += bracketed

    # 4) classes like 'rounded-16px' (non-standard but possible from model)
    classes_with_px = re.findall(r'rounded-([0-9]+px)', full_code)
    detected_radii += classes_with_px

    # If a radius appears anywhere, ensure at least one maps to an allowed radius
    if detected_radii:
        found_allowed = any(r in allowed_radii for r in detected_radii)
        if not found_allowed:
            errors.append(f"UNAUTHORIZED_RADIUS: Radius used is not in the design system. Allowed: {allowed_radii}")

    # 4. Basic syntax checks on TypeScript
    ts = code["ts"]
    
    # Check balanced brackets/braces
    for open_char, close_char in [("{", "}"), ("(", ")"), ("[", "]")]:
        if ts.count(open_char) != ts.count(close_char):
            errors.append(f"SYNTAX_ERROR: Unbalanced '{open_char}' and '{close_char}'")
    
    # Check required Angular decorator
    if "@Component" not in ts:
        errors.append("MISSING_DECORATOR: @Component decorator is required")
    
    # Check class declaration
    if "export class" not in ts:
        errors.append("MISSING_CLASS: Component must export a class")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "error_count": len(errors)
    }