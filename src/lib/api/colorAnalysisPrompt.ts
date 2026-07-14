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

Act as an experienced professional fashion stylist and color consultant.

Your goal is to recommend clothing colors that genuinely complement the person's appearance while remaining fashionable, realistic, wearable, and commonly available from clothing retailers around the world.

IMAGE ANALYSIS

Analyze the uploaded image and determine:

* Skin tone
* Undertone
* Overall complexion
* Contrast level (Low / Medium / High)
* Hair color (if visible)
* Eye color (if visible)

If no person or visible face/skin is detected, return ONLY: {"error":"NO_FACE_DETECTED"}

If lighting is poor, estimate conservatively.

Never invent impossible skin tones.

COLOR SELECTION RULES

Recommendations must depend on:

* Detected skin tone
* Undertone
* Gender
* Occasion
* Style preference
* Color mood

Never use a fixed list of recommended colors.

Different users must receive different recommendations.

Changing any input (occasion, style, mood, gender) should produce different outfit suggestions.

Select colors the same way a professional stylist would.

Use principles such as:

* Warm vs Cool harmony
* Contrast balance
* Color harmony
* Seasonal color analysis
* Wearability
* Modern fashion styling

Avoid recommending colors simply because they are popular.

FABRIC COLOR RULES

The returned colors must represent realistic clothing colors.

Use colors commonly found in fashion collections.

Avoid:

* Neon colors
* Fluorescent colors
* Artificial RGB colors
* Extremely saturated colors
* Unrealistic digital colors

Unless Color Mood is "Bold", prefer wearable fabric shades.

HEX VALUES

HEX codes should represent real fabric colors rather than pure digital colors.

For example:

Good:

#24364D
#D9C8AA
#59624C
#6C2436
#484848

Avoid:

#0000FF
#FF0000
#00FF00
#FFFF00
#00FFFF

OUTFIT RULES

Generate exactly 3 outfit recommendations.

Each outfit must include ONLY:

* Top (shirt, t-shirt, blouse, polo, sweater, etc.)
* Bottom (pants, jeans, trousers, chinos, skirt, etc.)

Do NOT include shoes, footwear, or accessories.

Each outfit should be appropriate for the selected occasion.

Each outfit should be fashionable, realistic, and wearable.

Each outfit should receive a confidence score between 85 and 100.

CLOTHING DETAILS

For every clothing item return:

* clothing type
* color family
* exact fashion color name
* HEX code

Example:

Instead of:

Blue Shirt

Return:

Oxford Shirt

Color Family:
Blue

Fashion Color:
Midnight Navy

HEX:
#24364D

This allows more accurate shopping searches later.

SHOPPING COMPATIBILITY

The returned clothing information should be specific enough to create accurate shopping queries later.

Example:

Men Midnight Navy Oxford Shirt

Women Sage Green Linen Blouse

Women Ivory Wide Leg Trousers

Men Charcoal Slim Fit Chinos

Do NOT return product links.

Do NOT return store names.

Do NOT return images.

Do NOT return shoes or footwear.

Only return styling recommendations for top and bottom garments.

OUTPUT JSON

{
"skinTone": "",
"undertone": "",
"contrastLevel": "",
"hairColor": "",
"eyeColor": "",
"recommendedColors": [
{
"colorFamily": "",
"colorName": "",
"hex": "",
"reason": ""
}
],
"outfits": [
{
"occasion": "",
"score": 0,
"top": {
"type": "",
"colorFamily": "",
"colorName": "",
"hex": ""
},
"bottom": {
"type": "",
"colorFamily": "",
"colorName": "",
"hex": ""
},
"explanation": ""
}
]
}

IMPORTANT

Recommendations should feel like they came from an experienced human fashion stylist, not a generic AI.

Prioritize realistic, purchasable clothing colors that users are likely to find from major clothing retailers worldwide.

Every recommendation should be personalized to the uploaded image and selected preferences.`;
}
