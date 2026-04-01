function splitCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function tokenizeList(value) {
  if (!value) {
    return [];
  }

  return value
    .split(/[|;/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCsv(csvText) {
  const lines = String(csvText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((header) =>
    header.toLowerCase().replace(/\s+/g, "_")
  );

  return lines.slice(1).map((line) => {
    const row = {};
    const values = splitCsvLine(line);

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    return row;
  });
}

module.exports = {
  parseCsv,
  tokenizeList,
};
