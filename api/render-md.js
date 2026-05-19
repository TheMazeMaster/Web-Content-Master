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

function renderParagraph(buffer) {
  const joined = buffer.map(line => escapeHtml(line)).join('<br>');
  return `<p>${parseInline(joined)}</p>`;
}

function renderBlockquote(buffer) {
  const joined = buffer.map(line => escapeHtml(line)).join('<br>');
  return `<blockquote>${parseInline(joined)}</blockquote>`;
}

function splitTableRow(line) {
  let cleaned = line.trim();

  if (cleaned.startsWith('|')) cleaned = cleaned.slice(1);
  if (cleaned.endsWith('|')) cleaned = cleaned.slice(0, -1);

  return cleaned.split('|').map(cell => cell.trim());
}

function isTableSeparator(line) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function renderTable(rows) {
  if (rows.length < 2) return '';

  const headerCells = splitTableRow(rows[0]);
  const bodyRows = rows.slice(2);

  let html = '<div class="table-wrap"><table><thead><tr>';

  for (const cell of headerCells) {
    html += `<th>${parseInline(escapeHtml(cell))}</th>`;
  }

  html += '</tr></thead><tbody>';

  for (const row of bodyRows) {
    const cells = splitTableRow(row);
    html += '<tr>';

    for (const cell of cells) {
      html += `<td>${parseInline(escapeHtml(cell))}</td>`;
    }

    html += '</tr>';
  }

  html += '</tbody></table></div>';

  return html;
}

function markdownToHtml(md) {
  const lines = md.split('\n');
  let html = '';
  let inList = false;
  let paragraphBuffer = [];
  let blockquoteBuffer = [];
  let tableBuffer = [];

  function flushParagraph() {
    if (paragraphBuffer.length > 0) {
      html += renderParagraph(paragraphBuffer);
      paragraphBuffer = [];
    }
  }

  function flushBlockquote() {
    if (blockquoteBuffer.length > 0) {
      html += renderBlockquote(blockquoteBuffer);
      blockquoteBuffer = [];
    }
  }

  function flushTable() {
    if (tableBuffer.length > 0) {
      html += renderTable(tableBuffer);
      tableBuffer = [];
    }
  }

  function closeList() {
    if (inList) {
      html += '</ul>';
      inList = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';

    const startsTable =
      trimmed.includes('|') &&
      nextLine.includes('|') &&
      isTableSeparator(nextLine);

    const continuesTable =
      tableBuffer.length > 0 &&
      trimmed.includes('|') &&
      trimmed !== '';

    if (startsTable || continuesTable) {
      flushParagraph();
      flushBlockquote();
      closeList();
      tableBuffer.push(trimmed);
      continue;
    }

    if (tableBuffer.length > 0) {
      flushTable();
    }

    if (trimmed === '') {
      flushParagraph();
      flushBlockquote();
      closeList();
      continue;
    }

    if (trimmed === '---') {
      flushParagraph();
      flushBlockquote();
      closeList();
      html += '<hr>';
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushParagraph();
      flushBlockquote();
      closeList();
      html += `<h3>${parseInline(escapeHtml(trimmed.slice(4)))}</h3>`;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushParagraph();
      flushBlockquote();
      closeList();
      html += `<h2>${parseInline(escapeHtml(trimmed.slice(3)))}</h2>`;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      flushParagraph();
      flushBlockquote();
      closeList();
      html += `<h1>${parseInline(escapeHtml(trimmed.slice(2)))}</h1>`;
      continue;
    }

    if (trimmed.startsWith('- ')) {
      flushParagraph();
      flushBlockquote();
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${parseInline(escapeHtml(trimmed.slice(2)))}</li>`;
      continue;
    }

    if (trimmed.startsWith('> ')) {
      flushParagraph();
      closeList();
      blockquoteBuffer.push(trimmed.slice(2));
      continue;
    }

    flushBlockquote();
    closeList();
    paragraphBuffer.push(trimmed);
  }

  flushParagraph();
  flushBlockquote();
  flushTable();
  closeList();

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
            h1 {
              margin-top: 0;
            }
            p {
              margin: 1em 0;
            }
            ul {
              margin: 1em 0;
              padding-left: 1.5em;
            }
            hr {
              margin: 2em 0;
              border: 0;
              border-top: 1px solid #ccc;
            }
            blockquote {
              margin: 1em 0 1em 1.5em;
              padding-left: 1em;
              border-left: 3px solid #999;
              color: #333;
            }
            .table-wrap {
              overflow-x: auto;
              margin: 1.5em 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 0.95em;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 0.6em 0.8em;
              text-align: left;
              vertical-align: top;
            }
            th {
              font-weight: bold;
              background: #f5f5f5;
            }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Error loading markdown');
  }
}
