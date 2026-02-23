import * as crypto from 'crypto';

const BOT_TOKEN = 'your-bot-token';

const user = {
  id: 123456789,
  first_name: 'Test',
  last_name: 'User',
  username: 'testuser',
};

const params = new URLSearchParams({
  user: JSON.stringify(user),
  auth_date: String(Math.floor(Date.now() / 1000)),
  chat_instance: '1234567890',
  chat_type: 'private',
});

// Строим data-check-string
const dataCheckString = [...params.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `${k}=${v}`)
  .join('\n');

// Считаем hash
const secretKey = crypto
  .createHmac('sha256', 'WebAppData')
  .update(BOT_TOKEN)
  .digest();

const hash = crypto
  .createHmac('sha256', secretKey)
  .update(dataCheckString)
  .digest('hex');

params.set('hash', hash);

console.log('initData:', params.toString());
console.log('\nHeader:');
console.log(`Authorization: TgWebApp ${params.toString()}`);
