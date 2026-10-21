// api/gigachat.js
export default async function handler(req, res) {
  // Разрешаем запросы с твоего сайта (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  const AUTH_KEY = 'MDFhMTVmMzItZjdmYS03NmIzLTk5MWYtNWRiZWFjMzRiZmFiOjAwZTIwYTgxLTNlN2UtNGM3OC1hZDUwLWMwNTA5YzFkMzJlNA=='; // Твой ключ

  try {
    // 1. Получаем токен
    const authResponse = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': crypto.randomUUID(),
        'Authorization': `Basic ${AUTH_KEY}`
      },
      body: 'scope=GIGACHAT_API_PERS'
    });

    if (!authResponse.ok) {
        const err = await authResponse.text();
        throw new Error(`Auth error: ${authResponse.status} ${err}`);
    }
    const authData = await authResponse.json();

    // 2. Запрос к нейросети
    const chatResponse = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`
      },
      body: JSON.stringify({
        model: 'GigaChat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 60
      })
    });

    if (!chatResponse.ok) {
        const err = await chatResponse.text();
        throw new Error(`API error: ${chatResponse.status} ${err}`);
    }
    const chatData = await chatResponse.json();
    
    // Возвращаем ответ на сайт
    res.status(200).json({ text: chatData.choices[0].message.content });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
