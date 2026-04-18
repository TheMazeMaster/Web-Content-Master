function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req, res) {
  const path = req.query.path || '';

  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/TheMazeMaster/Web-Content-Master/main/${path}.md`
    );

    if (!response.ok) {
      res.status(404).send('Markdown file not found');
      return;
    }

    const text = await response.text();

    res.setHeader('Content-Type', 'text/html');

    res.send(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${path}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 0 20px;
              line-height: 1.6;
              color: #111;
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>${escapeHtml(text)}</body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Error loading markdown');
  }
}
