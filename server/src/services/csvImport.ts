export interface ParsedRow {
  rowIndex: number;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
}

export interface ParseResult {
  rows: ParsedRow[];
  skipped: { rowIndex: number; reason: string }[];
}

function parseCsvLines(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const chars = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];

    if (inQuotes) {
      if (char === '"') {
        if (chars[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function findColumn(headers: string[], patterns: RegExp[]): number {
  for (const pattern of patterns) {
    const idx = headers.findIndex((h) => pattern.test(h));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseDate(value: string): string | null {
  const trimmed = value.trim();
  const native = Date.parse(trimmed);
  if (!Number.isNaN(native)) {
    return new Date(native).toISOString().slice(0, 10);
  }

  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (match) {
    const [, a, b, rawYear] = match;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    // Assumes MM/DD/YYYY - the most common bank export format.
    const date = new Date(Date.UTC(Number(year), Number(a) - 1, Number(b)));
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  return null;
}

function parseAmount(value: string): number | null {
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function parseBankCsv(text: string): ParseResult {
  const table = parseCsvLines(text);
  if (table.length < 2) {
    return { rows: [], skipped: [{ rowIndex: 0, reason: "No data rows found" }] };
  }

  const headers = table[0].map((h) => h.trim().toLowerCase());

  const dateIdx = findColumn(headers, [/^date$/, /transaction date/, /posted date/, /date posted/]);
  const descIdx = findColumn(headers, [/^description$/, /narrative/, /details/, /memo/, /payee/]);
  const amountIdx = findColumn(headers, [/^amount$/]);
  const debitIdx = findColumn(headers, [/^debit$/, /withdrawal/]);
  const creditIdx = findColumn(headers, [/^credit$/, /deposit/]);

  if (dateIdx === -1 || descIdx === -1 || (amountIdx === -1 && debitIdx === -1 && creditIdx === -1)) {
    return {
      rows: [],
      skipped: [
        {
          rowIndex: 0,
          reason: "Could not detect Date, Description, and Amount (or Debit/Credit) columns in the CSV header",
        },
      ],
    };
  }

  const rows: ParsedRow[] = [];
  const skipped: { rowIndex: number; reason: string }[] = [];

  for (let i = 1; i < table.length; i++) {
    const cols = table[i];
    const rawDate = cols[dateIdx] ?? "";
    const description = (cols[descIdx] ?? "").trim();

    const date = parseDate(rawDate);
    if (!date) {
      skipped.push({ rowIndex: i, reason: `Could not parse date: "${rawDate}"` });
      continue;
    }

    let amount: number | null = null;
    let type: "income" | "expense" | null = null;

    if (amountIdx !== -1) {
      const value = parseAmount(cols[amountIdx] ?? "");
      if (value === null) {
        skipped.push({ rowIndex: i, reason: `Could not parse amount: "${cols[amountIdx]}"` });
        continue;
      }
      amount = Math.abs(value);
      type = value < 0 ? "expense" : "income";
    } else {
      const debitValue = debitIdx !== -1 ? parseAmount(cols[debitIdx] ?? "") : null;
      const creditValue = creditIdx !== -1 ? parseAmount(cols[creditIdx] ?? "") : null;

      if (debitValue) {
        amount = Math.abs(debitValue);
        type = "expense";
      } else if (creditValue) {
        amount = Math.abs(creditValue);
        type = "income";
      } else {
        skipped.push({ rowIndex: i, reason: "No debit or credit amount found" });
        continue;
      }
    }

    if (!amount || amount === 0) {
      skipped.push({ rowIndex: i, reason: "Amount is zero" });
      continue;
    }

    rows.push({ rowIndex: i, date, description: description || "Imported transaction", amount, type });
  }

  return { rows, skipped };
}