import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testReceipt() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not found in .env.local');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  const imagePath = path.join(__dirname, 'receipts', 'Kroger1.jfif');
  if (!fs.existsSync(imagePath)) {
    console.error('Receipt not found:', imagePath);
    process.exit(1);
  }

  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString('base64');

  console.log('🧪 Testing Claude Vision on Kroger1.jfif');
  console.log('Image size:', imageData.length, 'bytes');
  console.log('---');

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
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
              text: 'What grocery items do you see in this receipt? Just list them.',
            },
          ],
        },
      ],
    });

    const response = message.content[0];
    if (response.type === 'text') {
      console.log('✅ Claude Response:');
      console.log(response.text);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testReceipt();
