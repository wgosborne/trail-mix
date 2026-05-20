const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('Error: ANTHROPIC_API_KEY environment variable not set');
  process.exit(1);
}

const client = new Anthropic({ apiKey });

async function testReceipt() {
  // Read the image file
  const imagePath = path.join(__dirname, 'receipts', 'AldiReceiptPic.jfif');
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');

  console.log('Testing receipt parsing...\n');

  // Current prompt (Kroger-specific)
  const currentPrompt = `You are a Kroger receipt parser. Extract every grocery product from this receipt with accurate quantities and units.

EXTRACTION RULES:
1. Find EVERY product/item in the "Items" or "Groceries" section
2. For each item, extract:
   - "name": Product description (remove quantity/unit from name)
   - "quantity": Number from the product description or receipt (required)
   - "unit": Unit of measure (oz, lbs, g, count, ct, ea, etc.)

IMPORTANT - Extract quantity from product names:
- "Tyson Frozen Chicken, 18 oz" → quantity: 18, unit: "oz", name: "Tyson Frozen Chicken"
- "Mission Tortillas, 8 ct" → quantity: 8, unit: "ct", name: "Mission Tortillas"
- "Simply Orange, 1 gallon" → quantity: 1, unit: "gallon", name: "Simply Orange"
- "Eggs, 1 dozen" → quantity: 12, unit: "count", name: "Eggs"
- "Milk, 1 gallon" → quantity: 1, unit: "gallon", name: "Milk"
- If no unit/quantity in name, default to: quantity: 1, unit: "count" (ea)

Return ONLY valid JSON:
{
  "items": [
    { "name": "Product Name Only", "quantity": 18, "unit": "oz" },
    { "name": "Another Product", "quantity": 1, "unit": "count" }
  ]
}

SPECIAL CASES:
- Quantity is the number (not including the word "pack", "box", etc.)
- Unit is the abbreviation (oz, lbs, g, ct, ea, count, gallon, etc.)
- Name should be clean and readable (no quantity/unit info)

If no items found, return: { "items": [] }
Otherwise, return ALL items with proper quantity/unit extraction.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64,
              },
            },
            {
              type: 'text',
              text: currentPrompt,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    let jsonText = textContent.text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```\n?$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```\n?$/, '');
    }

    const parsed = JSON.parse(jsonText);

    console.log('CURRENT PROMPT EXTRACTION:');
    console.log(JSON.stringify(parsed, null, 2));
    console.log(`\nTotal items extracted: ${parsed.items?.length || 0}`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testReceipt();
