// netlify/functions/tithly-sync.js
// Fetches contributions from Tithly

module.exports = async (req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { api_key, start_date, end_date } = JSON.parse(event.body);

    const response = await fetch('https://api.tithly.com/v1/contributions', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Tithly API error: ' + response.statusText);
    }

    const data = await response.json();

    const formatted = data.contributions
      .filter(c => {
        const date = new Date(c.created_at);
        return date >= new Date(start_date) && date <= new Date(end_date);
      })
      .map(c => ({
        name: `${c.first_name} ${c.last_name}`,
        date: new Date(c.created_at).toISOString().split('T')[0],
        amount: parseFloat(c.amount),
        source: 'tithly'
      }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ transactions: formatted })
    };
  } catch (error) {
    console.error('Tithly sync error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
