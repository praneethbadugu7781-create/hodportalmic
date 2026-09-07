import { PDFParse } from 'pdf-parse';

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
 * Robust extractor that parses students from PDF documents (nominal rolls, attendance sheets, export tables)
 */
export async function extractStudentsFromPdf(
  pdfBuffer: Buffer,
  options: ParsePdfOptions = {}
): Promise<{ students: ExtractedStudent[]; rawText: string; totalDetected: number }> {
  const defaultYear = options.defaultYear || '3rd Year';
  const defaultSection = options.defaultSection || 'A';
  const defaultDepartment = options.defaultDepartment || 'Artificial Intelligence & Machine Learning';

  const parser = new PDFParse({ data: pdfBuffer });
  const textResult = await parser.getText();
  const fullText = textResult.text || '';

  if (!fullText.trim()) {
    return { students: [], rawText: '', totalDetected: 0 };
  }

  // Regex to match student roll numbers:
  // Typically 10 chars (e.g. 24H71A6101, 23H75A0501, 22H71A...) or 8-12 alphanumeric token with letters & numbers
  const rollRegex = /(?:^|[\s,;:(/\[])([0-9]{2}[A-Za-z0-9]{2}[15A-Za-z][A-Za-z0-9]{5})(?=[\s,;:\"'\n\r)/\]]|$)/gi;
  const matches: { roll: string; index: number }[] = [];
  let m: RegExpExecArray | null;

  while ((m = rollRegex.exec(fullText)) !== null) {
    const candidateRoll = m[1].toUpperCase();

    // Must have at least one letter and at least one digit (to avoid pure phone numbers like 9876543210)
    if (/[A-Z]/i.test(candidateRoll) && /\d/.test(candidateRoll)) {
      const matchIndex = m.index + m[0].indexOf(m[1]);

      // Ensure it is not an email prefix (e.g. 24h71a6101@mictech.edu.in)
      const beforeChar = fullText.slice(Math.max(0, matchIndex - 1), matchIndex);
      const afterChar = fullText.slice(matchIndex + candidateRoll.length, matchIndex + candidateRoll.length + 1);

      if (beforeChar !== '@' && afterChar !== '@') {
        matches.push({ roll: candidateRoll, index: matchIndex });
      }
    }
  }

  // Fallback: If no 10-char JNTU/autonomous roll numbers found, search for generic alphanumeric roll tokens
  if (matches.length === 0) {
    const genericRollRegex = /(?:^|[\s,;:(/\[])([A-Za-z0-9]{2,4}[-_]?[0-9]{3,6})(?=[\s,;:\"'\n\r)/\]]|$)/gi;
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
    namePart = namePart.replace(/\b(?:B\.?Tech|Semester|Department|Artificial|Intelligence|Machine|Learning|AIML|CSE)\b/gi, ' ');
    namePart = namePart.replace(/\bPage\s*\d+\s*(?:of\s*\d+)?\b/gi, ' ');
    namePart = namePart.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, ' ');
    namePart = namePart.replace(/^\s*\d+[\s.)-]+/, ' '); // remove S.No numbers
    namePart = namePart.replace(/[^a-zA-Z\s.-]/g, ' ');

    let cleanName = namePart.trim().replace(/\s+/g, ' ');

    // If clean name has leftover words or is empty, provide clean fallback
    if (!cleanName || cleanName.length < 2) {
      cleanName = `Student ${current.roll}`;
    }

    // Truncate name if it picked up extra text (e.g. > 50 chars)
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

  return {
    students,
    rawText: fullText.slice(0, 1000),
    totalDetected: students.length,
  };
}
