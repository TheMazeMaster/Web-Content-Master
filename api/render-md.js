export default async function handler(req, res) {
  const url = req.query.path || '';

  try {
    const response = await fetch(`https://${req.headers.host}/${url}.md`);
    const text = await response.text();

    res.setHeader('Content-Type', 'text/html');

    res.send(`
      <html>
        <head>
          <style>
            body {
              font-family: Arial;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <pre>${text}</pre>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Error loading markdown');
  }
}
