// netlify/functions/plaid-exchange.js
// Exchanges public token for access token after user connects bank

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
    const { public_token } = JSON.parse(event.body);

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

    const response = await client.itemPublicTokenExchange({
      public_token: public_token,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access_token: response.data.access_token,
        item_id: response.data.item_id
      })
    };
  } catch (error) {
    console.error('Token exchange error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
