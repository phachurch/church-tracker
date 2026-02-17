// netlify/functions/sheets-update.js
// Updates Google Sheets with contribution data

const { google } = require('googleapis');

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
    const { spreadsheetId, contributions } = JSON.parse(event.body);

    // Set up Google Sheets API with service account
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Get existing data
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'Contributions!A:ZZ',
    });

    const existingData = getResponse.data.values || [['Name', 'Total']];
    const headers_row = existingData[0] || ['Name', 'Total'];

    // Build contributor map
    const contributorRows = {};
    for (let i = 1; i < existingData.length; i++) {
      const name = existingData[i][0];
      if (name) contributorRows[name] = i;
    }

    // Group contributions by name
    const byName = {};
    contributions.forEach(c => {
      if (!byName[c.name]) byName[c.name] = [];
      byName[c.name].push(c);
    });

    // Process each contributor
    for (const [name, contribs] of Object.entries(byName)) {
      let rowIndex = contributorRows[name];

      if (rowIndex === undefined) {
        rowIndex = existingData.length;
        existingData.push([name, 0]);
        contributorRows[name] = rowIndex;
      }

      const rowData = existingData[rowIndex] || [name];
      while (rowData.length < headers_row.length) {
        rowData.push('');
      }

      contribs.forEach(contrib => {
        const dateStr = new Date(contrib.date).toLocaleDateString();
        const columnHeader = `${dateStr} (${contrib.source.toUpperCase()})`;

        let colIndex = headers_row.indexOf(columnHeader);
        if (colIndex === -1) {
          colIndex = headers_row.length;
          headers_row.push(columnHeader);
          existingData.forEach(row => {
            while (row.length < headers_row.length) row.push('');
          });
        }

        if (!rowData[colIndex] || rowData[colIndex] === '') {
          rowData[colIndex] = contrib.amount;
        } else {
          rowData[colIndex] = parseFloat(rowData[colIndex]) + contrib.amount;
        }
      });

      // Calculate total
      let total = 0;
      for (let i = 2; i < rowData.length; i++) {
        const val = parseFloat(rowData[i]);
        if (!isNaN(val)) total += val;
      }
      rowData[1] = total;

      existingData[rowIndex] = rowData;
    }

    // Update headers
    existingData[0] = headers_row;

    // Clear and update sheet
    await sheets.spreadsheets.values.clear({
      spreadsheetId: spreadsheetId,
      range: 'Contributions!A:ZZ',
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: 'Contributions!A1',
      valueInputOption: 'USER_ENTERED',
      resource: { values: existingData },
    });

    // Format header
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      resource: {
        requests: [{
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.4, green: 0.49, blue: 0.92 },
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  fontSize: 11,
                  bold: true,
                },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        }],
      },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: `Updated ${Object.keys(byName).length} contributor(s)` 
      }),
    };
  } catch (error) {
    console.error('Sheets update error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
