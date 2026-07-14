export function buildColorAnalysisPrompt(input: {
  gender: string;
  occasion: string;
  stylePreference: string;
  colorMood: string;
}) {
  // Keep in sync with supabase/functions/_shared/colorAnalysisPrompt.ts
  return `Analyze the uploaded user photo and generate professional clothing color recommendations based on:

* User image
* Gender: ${input.gender}
* Occasion: ${input.occasion}
* Style preference: ${input.stylePreference}
* Color mood: ${input.colorMood}

Return ONLY valid JSON.
Do NOT return markdown.
Do NOT return explanations outside the JSON.

OBJECTIVE
Act as a professional fashion stylist who picks REAL clothing dye colors from major retailers (Zara, H&M, Uniqlo, Levi's, Nike, etc.).
Colors must look like dyed fabric in natural light — soft, muted, slightly dusty — never glowing screen/UI colors.

IMAGE ANALYSIS
Determine: skinTone, undertone, contrastLevel (Low/Medium/High), hairColor, eyeColor.
If no person/face/skin is visible, return ONLY: {"error":"NO_FACE_DETECTED"}

NATURAL FABRIC COLOR RULES (CRITICAL)
HEX values must look like real cloth, not digital paint:
* Prefer lower-saturation fabric tones (cotton, linen, wool, denim, knit)
* Favor dusty, washed, heathered, garment-dyed finishes
* Avoid neon, fluorescent, pure primary RGB, electric/bright UI colors
* Avoid pure #000000 / #FFFFFF unless a true black/white fabric is needed; prefer soft black or ivory
* Each HEX should look believable in a product photo of a shirt or trousers

Good fabric HEX examples:
#2F3E46 (charcoal teal), #8A6D4F (camel), #5C6B4A (olive), #6B3A3A (brick),
#3E4C5E (slate navy), #C4B7A6 (stone), #7A5C58 (rosewood), #4A5D4E (forest)

Bad (forbidden-looking) HEX examples:
#0000FF #00BFFF #FF00FF #00FF00 #FF0000 #FFFF00 #00FFFF #7C3AED #3B82F6

recommendedColors: return exactly 4 DIFFERENT wearable fabric colors that suit this person.
Each colorFamily must be unique when possible (e.g. Blue, Green, Neutral, Red — not four blues).

OUTFIT RULES
Generate exactly 3 outfits for the selected occasion.
Each outfit = top + bottom only (no shoes/accessories).
IMPORTANT COLOR DIVERSITY:
* The 3 outfit tops must use DIFFERENT colorNames/hex values (not the same blue three times)
* The 3 outfit bottoms should also vary when possible (e.g. charcoal, khaki, navy — not identical)
* Outfit garment colors should come from the recommendedColors set or closely related fabric shades
* Include realistic garment types shoppers can buy (Oxford shirt, polo, tee, chinos, jeans, trousers, etc.)

Score each outfit 85–100.

CLOTHING DETAILS
For every top/bottom return:
* type (specific garment, e.g. "Oxford Shirt", "Slim Chinos")
* colorFamily
* colorName (fashion name, e.g. "Midnight Navy", "Stone Beige")
* hex (natural fabric HEX)

SHOPPING COMPATIBILITY
colorName + type should form a good shopping query, e.g. "Men Midnight Navy Oxford Shirt".

OUTPUT JSON SHAPE
{
  "skinTone": "",
  "undertone": "",
  "contrastLevel": "",
  "hairColor": "",
  "eyeColor": "",
  "recommendedColors": [
    { "colorFamily": "", "colorName": "", "hex": "", "reason": "" }
  ],
  "outfits": [
    {
      "occasion": "",
      "score": 0,
      "top": { "type": "", "colorFamily": "", "colorName": "", "hex": "" },
      "bottom": { "type": "", "colorFamily": "", "colorName": "", "hex": "" },
      "explanation": ""
    }
  ]
}

Prioritize realistic purchasable fabric colors personalized to this photo and preferences.`;
}
