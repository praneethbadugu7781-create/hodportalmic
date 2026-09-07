import zlib from 'zlib';

export interface ExtractedStudent {
  roll_number: string;
  name: string;
  email: string;
  phone: string | null;
  year: string;
  section: string;
  department: string;
}

export interface ParsePdfOptions {
  defaultYear?: string;
  defaultSection?: string;
  defaultDepartment?: string;
}

/**
 * Unescape PDF literal string escapes: \ddd (octal), \n, \r, \t, \(, \), \\
 */
function decodePdfLiteralString(str: string): string {
  return str
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

/**
 * Decode hex strings like <3234483731>
 */
function decodePdfHexString(hex: string): string {
  const cleanHex = hex.replace(/\s+/g, '');
  let result = '';
  for (let i = 0; i < cleanHex.length; i += 2) {
    const byteHex = cleanHex.substr(i, 2);
    if (byteHex.length === 1) {
      result += String.fromCharCode(parseInt(byteHex + '0', 16));
    } else {
      result += String.fromCharCode(parseInt(byteHex, 16));
    }
  }
  return result;
}

/**
 * Zero-dependency pure Node.js PDF text extractor using built-in zlib.
 * Extracts text operators from FlateDecode compressed streams and uncompressed content streams.
 */
export function extractTextPure(buffer: Buffer): string {
  const binary = buffer.toString('latin1');
  let fullText = '';

  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(binary)) !== null) {
    const rawChunk = Buffer.from(match[1], 'latin1');
    let decompressed = '';
    try {
      decompressed = zlib.inflateSync(rawChunk).toString('latin1');
    } catch {
      try {
        decompressed = zlib.unzipSync(rawChunk).toString('latin1');
      } catch {
        decompressed = rawChunk.toString('latin1');
      }
    }

    // Extract text from text blocks: (string) Tj
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tj: RegExpExecArray | null;
    while ((tj = tjRegex.exec(decompressed)) !== null) {
      fullText += decodePdfLiteralString(tj[1]) + ' ';
    }

    // Extract text from hex: <hex> Tj
    const tjHexRegex = /<([0-9a-fA-F\s]+)>\s*Tj/g;
    let tjHex: RegExpExecArray | null;
    while ((tjHex = tjHexRegex.exec(decompressed)) !== null) {
      fullText += decodePdfHexString(tjHex[1]) + ' ';
    }

    // Extract text from text arrays: [(string) 20 (string)] TJ or [<hex> 10 <hex>] TJ
    const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let tja: RegExpExecArray | null;
    while ((tja = tjArrayRegex.exec(decompressed)) !== null) {
      const arrayContent = tja[1];
      const elemRegex = /\(([^)]*)\)|<([0-9a-fA-F\s]+)>/g;
      let elem: RegExpExecArray | null;
      let combined = '';
      while ((elem = elemRegex.exec(arrayContent)) !== null) {
        if (elem[1] !== undefined) {
          combined += decodePdfLiteralString(elem[1]);
        } else if (elem[2] !== undefined) {
          combined += decodePdfHexString(elem[2]);
        }
      }
      fullText += combined + ' ';
    }

    // Extract text from ' operator: (string) '
    const quoteRegex = /\(([^)]*)\)\s*['"]/g;
    let qr: RegExpExecArray | null;
    while ((qr = quoteRegex.exec(decompressed)) !== null) {
      fullText += decodePdfLiteralString(qr[1]) + '\n';
    }
  }

  // Fallback: If no stream text found, scan for literal strings in uncompressed PDF objects
  if (!fullText.trim()) {
    const rawLiteralRegex = /\(([^)]+)\)/g;
    let rl: RegExpExecArray | null;
    while ((rl = rawLiteralRegex.exec(binary)) !== null) {
      if (rl[1].length > 3 && /[a-zA-Z0-9]/.test(rl[1])) {
        fullText += decodePdfLiteralString(rl[1]) + ' ';
      }
    }
  }

  return fullText;
}

/**
 * Text extractor using pdfjs-dist legacy Node.js build with coordinate row grouping.
 */
async function extractTextWithPdfJs(buffer: Buffer): Promise<string> {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      disableFontFace: true,
      useSystemFonts: true,
    });

    const pdfDocument = await loadingTask.promise;
    let textResult = '';

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const content = await page.getTextContent();

      // Group text items by Y coordinate so rows are ordered top-to-bottom and left-to-right
      const linesMap = new Map<number, { x: number; str: string }[]>();

      for (const item of content.items) {
        if (!('str' in item) || !item.str.trim()) continue;
        const y = Math.round(item.transform[5]);

        let targetY: number | null = null;
        for (const k of Array.from(linesMap.keys())) {
          if (Math.abs(k - y) <= 4) {
            targetY = k;
            break;
          }
        }

        if (targetY === null) {
          targetY = y;
          linesMap.set(targetY, []);
        }

        linesMap.get(targetY)!.push({ x: item.transform[4], str: item.str });
      }

      const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);
      for (const y of sortedY) {
        const rowItems = linesMap.get(y)!.sort((a, b) => a.x - b.x);
        textResult += rowItems.map((i) => i.str).join(' ') + '\n';
      }
    }

    return textResult;
  } catch (err) {
    console.warn('pdfjs-dist legacy extraction failed, falling back to pure zlib stream parser:', err);
    return '';
  }
}

/**
 * Robust parsing of students from plain text extracted from PDF documents.
 */
export function parseStudentsFromText(
  fullText: string,
  options: ParsePdfOptions = {}
): ExtractedStudent[] {
  const defaultYear = options.defaultYear || '3rd Year';
  const defaultSection = options.defaultSection || 'A';
  const defaultDepartment = options.defaultDepartment || 'Artificial Intelligence & Machine Learning';

  if (!fullText.trim()) return [];

  // Regex to match student roll numbers:
  // Typically 10 chars (e.g. 24H71A6101, 23H75A6101, 22H71A...) with delimiters
  const rollRegex = /(?:^|[\s,;:(/\[|\t])([0-9]{2}[A-Za-z0-9]{2}[15A-Za-z][A-Za-z0-9]{5})(?=[\s,;:\"'\n\r)/\]|\t]|$)/gi;
  const matches: { roll: string; index: number }[] = [];
  let m: RegExpExecArray | null;

  while ((m = rollRegex.exec(fullText)) !== null) {
    const candidateRoll = m[1].toUpperCase();

    // Must have at least one letter and at least one digit
    if (/[A-Z]/i.test(candidateRoll) && /\d/.test(candidateRoll)) {
      const matchIndex = m.index + m[0].indexOf(m[1]);

      const beforeChar = fullText.slice(Math.max(0, matchIndex - 1), matchIndex);
      const afterChar = fullText.slice(matchIndex + candidateRoll.length, matchIndex + candidateRoll.length + 1);

      if (beforeChar !== '@' && afterChar !== '@') {
        matches.push({ roll: candidateRoll, index: matchIndex });
      }
    }
  }

  // Fallback: If no 10-char roll numbers found, search for generic alphanumeric roll tokens
  if (matches.length === 0) {
    const genericRollRegex = /(?:^|[\s,;:(/\[|\t])([A-Za-z0-9]{2,4}[-_]?[0-9]{3,6})(?=[\s,;:\"'\n\r)/\]|\t]|$)/gi;
    let gm: RegExpExecArray | null;
    while ((gm = genericRollRegex.exec(fullText)) !== null) {
      const candidateRoll = gm[1].toUpperCase();
      if (/[A-Z]/i.test(candidateRoll) && /\d/.test(candidateRoll)) {
        const matchIndex = gm.index + gm[0].indexOf(gm[1]);
        const beforeChar = fullText.slice(Math.max(0, matchIndex - 1), matchIndex);
        const afterChar = fullText.slice(matchIndex + candidateRoll.length, matchIndex + candidateRoll.length + 1);
        if (beforeChar !== '@' && afterChar !== '@') {
          matches.push({ roll: candidateRoll, index: matchIndex });
        }
      }
    }
  }

  const students: ExtractedStudent[] = [];
  const seenRolls = new Set<string>();

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    if (seenRolls.has(current.roll)) continue;

    const startIndex = current.index + current.roll.length;
    const endIndex = i + 1 < matches.length ? matches[i + 1].index : fullText.length;

    let chunk = fullText.substring(startIndex, endIndex);

    // 1. Email Extraction
    const emailMatch = chunk.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
    const email = emailMatch
      ? emailMatch[1].toLowerCase()
      : `${current.roll.toLowerCase()}@mictech.edu.in`;

    // 2. Phone Extraction
    const phoneMatch = chunk.match(/\b([6-9]\d{9})\b/);
    const phone = phoneMatch ? phoneMatch[1] : null;

    // 3. Year Extraction
    let year = defaultYear;
    if (/2nd\s*Year|second\s*year|\bII(?:\s*B\.?Tech)?\b/i.test(chunk)) year = '2nd Year';
    else if (/3rd\s*Year|third\s*year|\bIII(?:\s*B\.?Tech)?\b/i.test(chunk)) year = '3rd Year';
    else if (/4th\s*Year|final\s*year|\bIV(?:\s*B\.?Tech)?\b/i.test(chunk)) year = 'Final Year';

    // 4. Section Extraction
    let section = defaultSection;
    const secMatch =
      chunk.match(/Sec(?:tion)?[\s\n.:-]*([A-C])\b/i) ||
      chunk.match(/\(([A-C])\)/i) ||
      chunk.match(/\b([A-C])\s*$/im);

    if (secMatch) {
      section = secMatch[1].toUpperCase();
    } else {
      // Auto-detect based on MIC College 3rd Year AIML standard roll mapping
      if (current.roll.startsWith('24H71A61')) {
        const lastPart = current.roll.slice(-2);
        const num = parseInt(lastPart, 10);
        if (!isNaN(num) && num <= 66) {
          section = 'A';
        } else {
          section = 'B';
        }
      }
    }

    // 5. Clean Student Name from remaining chunk
    let namePart = chunk;
    if (emailMatch) namePart = namePart.replace(emailMatch[0], ' ');
    if (phoneMatch) namePart = namePart.replace(phoneMatch[0], ' ');

    // Strip out common header / footer keywords and status tags
    namePart = namePart.replace(/\b(?:ACTIVE|INACTIVE|PENDING|COMPLETED|VERIFIED|DONE)\b/gi, ' ');
    namePart = namePart.replace(/\b(?:3rd|2nd|4th|final)\s*year\b/gi, ' ');
    namePart = namePart.replace(/Class\s*&\s*Sec(?:tion)?/gi, ' ');
    namePart = namePart.replace(/\(?Sec(?:tion)?[\s\n.:-]*[A-C]\)?/gi, ' ');
    namePart = namePart.replace(/\b(?:B\.?Tech|Semester|Department|Artificial|Intelligence|Machine|Learning|AIML|AI&ML|CSE)\b/gi, ' ');
    namePart = namePart.replace(/\bPage\s*\d+\s*(?:of\s*\d+)?\b/gi, ' ');
    namePart = namePart.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, ' ');
    namePart = namePart.replace(/^\s*\d+[\s.)-]+/, ' '); // remove S.No numbers
    namePart = namePart.replace(/[^a-zA-Z\s.-]/g, ' ');

    let cleanName = namePart.trim().replace(/\s+/g, ' ');
    // Strip leading or trailing dashes, dots, spaces
    cleanName = cleanName.replace(/^[-\s.]+|[-\s.]+$/g, '');

    // If clean name has leftover words or is empty, provide clean fallback
    if (!cleanName || cleanName.length < 2) {
      cleanName = `Student ${current.roll}`;
    }

    if (cleanName.length > 50) {
      cleanName = cleanName.slice(0, 50).trim();
    }

    students.push({
      roll_number: current.roll,
      name: cleanName,
      email,
      phone,
      year,
      section,
      department: defaultDepartment,
    });

    seenRolls.add(current.roll);
  }

  return students;
}

/**
 * Robust extractor that parses students from PDF documents (nominal rolls, attendance sheets, export tables)
 * Uses pdfjs-dist legacy with automatic fallback to pure zlib stream extraction.
 */
export async function extractStudentsFromPdf(
  pdfBuffer: Buffer,
  options: ParsePdfOptions = {}
): Promise<{ students: ExtractedStudent[]; rawText: string; totalDetected: number }> {
  // Strategy 1: Try pdfjs-dist legacy
  let rawText = await extractTextWithPdfJs(pdfBuffer);
  let students = parseStudentsFromText(rawText, options);

  // Strategy 2: If pdfjs yielded no students or empty text, fallback to pure zlib stream extractor
  if (students.length === 0) {
    const pureText = extractTextPure(pdfBuffer);
    if (pureText.trim()) {
      const pureStudents = parseStudentsFromText(pureText, options);
      if (pureStudents.length > 0) {
        students = pureStudents;
        rawText = pureText;
      }
    }
  }

  return {
    students,
    rawText: rawText.slice(0, 1000),
    totalDetected: students.length,
  };
}
