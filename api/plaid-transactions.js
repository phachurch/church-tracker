// netlify/functions/plaid-transactions.js
// Fetches transactions from connected bank account

const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

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
    const { access_token, start_date, end_date } = JSON.parse(event.body);

    const configuration = new Configuration({
      basePath: PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
        },
      },
    });

    const client = new PlaidApi(configuration);

    const response = await client.transactionsGet({
      access_token: access_token,
      start_date: start_date,
      end_date: end_date,
    });

    const zelleTransactions = response.data.transactions.filter(t => 
      t.amount < 0 &&
      (t.name.toLowerCase().includes('zelle') || 
       t.merchant_name?.toLowerCase().includes('zelle'))
    );

    const formatted = zelleTransactions.map(t => ({
      name: extractName(t.name),
      date: t.date,
      amount: Math.abs(t.amount),
      source: 'zelle'
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ transactions: formatted })
    };
  } catch (error) {
    console.error('Transaction fetch error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

function extractName(description) {
  let name = description
    .replace(/zelle payment from/gi, '')
    .replace(/zelle transfer from/gi, '')
    .replace(/from:/gi, '')
    .trim();
  
  const matches = name.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/);
  
  return matches ? matches[0] : name;
}
