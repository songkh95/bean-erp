import ExcelJS from "exceljs";

export function cellValueToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((t) => t.text).join("");
    }
    if ("text" in value && typeof (value as { text?: string }).text === "string") {
      return (value as { text: string }).text;
    }
    if ("result" in value) {
      const r = (value as { result?: ExcelJS.CellValue }).result;
      if (r !== undefined && r !== null) {
        return cellValueToString(r);
      }
    }
  }
  return String(value);
}

/**
 * Creates an xlsx with a single header row and triggers a browser download.
 */
export async function generateTemplate(options: {
  headers: string[];
  filename: string;
  sheetName?: string;
}): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(options.sheetName ?? "Sheet1");
  sheet.addRow(options.headers);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = options.filename.endsWith(".xlsx") ? options.filename : `${options.filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export type ParsedExcelRow = Record<string, string>;

export type ParseExcelResult = {
  headers: string[];
  rows: ParsedExcelRow[];
};

/** Ensures the first row of the sheet includes every required column (exact header text). */
export function assertHeadersMatch(required: readonly string[], actual: string[]): void {
  const set = new Set(actual.map((h) => h.trim()).filter(Boolean));
  const missing = required.filter((h) => !set.has(h));
  if (missing.length > 0) {
    throw new Error(`엑셀 양식이 올바르지 않습니다. 누락된 열: ${missing.join(", ")}`);
  }
}

/**
 * Reads the first worksheet: row 1 = headers (Korean column names), row 2+ = data.
 * Returns headers and one object per data row; keys are trimmed header strings, values are trimmed strings.
 */
export async function parseExcel(file: File): Promise<ParseExcelResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error("엑셀 파일에 시트가 없습니다.");
  }

  const headerRow = sheet.getRow(1);
  let maxCol = 0;
  headerRow.eachCell({ includeEmpty: false }, (_cell, colNumber) => {
    maxCol = Math.max(maxCol, colNumber);
  });

  if (maxCol === 0) {
    throw new Error("첫 번째 행에 헤더(컬럼명)가 필요합니다.");
  }

  const headers: string[] = [];
  for (let c = 1; c <= maxCol; c++) {
    headers.push(cellValueToString(headerRow.getCell(c).value).trim());
  }

  const rows: ParsedExcelRow[] = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const record: ParsedExcelRow = {};
    let anyValue = false;
    for (let c = 1; c <= maxCol; c++) {
      const h = headers[c - 1];
      if (!h) {
        continue;
      }
      const str = cellValueToString(row.getCell(c).value).trim();
      if (str) {
        anyValue = true;
      }
      record[h] = str;
    }
    if (anyValue) {
      rows.push(record);
    }
  });

  return { headers, rows };
}
