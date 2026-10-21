module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body;
  const AUTH_KEY = 'MDFhMTVmMzItZjdmYS03NmIzLTk5MWYtNWRiZWFjMzRiZmFiOjAwZTIwYTgxLTNlN2UtNGM3OC1hZDUwLWMwNTA5YzFkMzJlNA==';

  try {
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
        const errText = await authResponse.text();
        throw new Error(`Auth error: ${authResponse.status} - ${errText}`);
    }
    const authData = await authResponse.json();

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
        const errText = await chatResponse.text();
        throw new Error(`API error: ${chatResponse.status} - ${errText}`);
    }
    const chatData = await chatResponse.json();
    res.status(200).json({ text: chatData.choices[0].message.content });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
