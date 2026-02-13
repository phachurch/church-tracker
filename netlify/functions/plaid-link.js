// netlify/functions/plaid-link.js
// Creates a Plaid Link token for connecting bank accounts

const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

exports.handler = async (event, context) => {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const configuration = new Configuration({
      basePath: PlaidEnvironments.sandbox, // Use 'production' when ready
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
        },
      },
    });

    const client = new PlaidApi(configuration);

    const request = {
      user: {
        client_user_id: 'church-user',
      },
      client_name: 'PHA Church',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    };

    const response = await client.linkTokenCreate(request);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ link_token: response.data.link_token })
    };
  } catch (error) {
    console.error('Plaid link token error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
