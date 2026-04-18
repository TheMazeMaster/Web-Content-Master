function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function markdownToHtml(md) {
  const lines = md.split('\n');
  let html = '';
  let inList = false;

  for (let line of lines) {
    const trimmed = line.trim();

    if (trimmed === '') {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      continue;
    }

    if (trimmed === '---') {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += '<hr>';
      continue;
    }

    if (trimmed.startsWith('### ')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<h3>${parseInline(escapeHtml(trimmed.slice(4)))}</h3>`;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<h2>${parseInline(escapeHtml(trimmed.slice(3)))}</h2>`;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<h1>${parseInline(escapeHtml(trimmed.slice(2)))}</h1>`;
      continue;
    }

    if (trimmed.startsWith('- ')) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${parseInline(escapeHtml(trimmed.slice(2)))}</li>`;
      continue;
    }

    if (inList) {
      html += '</ul>';
      inList = false;
    }

    html += `<p>${parseInline(escapeHtml(trimmed))}</p>`;
  }

  if (inList) {
    html += '</ul>';
  }

  return html;
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
    const content = markdownToHtml(text);

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
              line-height: 1.7;
              color: #111;
            }
            h1, h2, h3 {
              line-height: 1.2;
              margin-top: 1.8em;
            }
            h1 { margin-top: 0; }
            p { margin: 1em 0; }
            ul { margin: 1em 0; padding-left: 1.5em; }
            hr { margin: 2em 0; border: 0; border-top: 1px solid #ccc; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Error loading markdown');
  }
}
