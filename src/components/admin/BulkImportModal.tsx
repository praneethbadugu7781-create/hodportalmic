'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  AlertTriangle,
  FileType,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '../ui/Toast';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

type ImportMode = 'auto' | 'pdf' | 'csv';

export function BulkImportModal({ isOpen, onClose, onImportSuccess }: BulkImportModalProps) {
  const { success, error, info } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'csv' | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Defaults for PDF import when not specified inside document
  const [defaultYear, setDefaultYear] = useState('3rd Year');
  const [defaultSection, setDefaultSection] = useState('A');
  const [defaultDepartment, setDefaultDepartment] = useState('Artificial Intelligence & Machine Learning');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    processSelectedFile(selectedFile);
  };

  // Helper to extract text from PDF in browser if server route fails
  const extractTextFromPdfInBrowser = async (pdfFile: File): Promise<string> => {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const len = bytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const slice = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, Array.from(slice));
    }

    let fullText = '';
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match: RegExpExecArray | null;

    while ((match = streamRegex.exec(binary)) !== null) {
      const rawChunkStr = match[1];
      let decompressed = '';

      if (typeof DecompressionStream !== 'undefined') {
        try {
          const rawBytes = new Uint8Array(rawChunkStr.length);
          for (let j = 0; j < rawChunkStr.length; j++) {
            rawBytes[j] = rawChunkStr.charCodeAt(j);
          }
          const ds = new DecompressionStream('deflate');
          const writer = ds.writable.getWriter();
          writer.write(rawBytes);
          writer.close();
          decompressed = await new Response(ds.readable).text();
        } catch {
          decompressed = rawChunkStr;
        }
      } else {
        decompressed = rawChunkStr;
      }

      // Extract text from text blocks: (string) Tj
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tj: RegExpExecArray | null;
      while ((tj = tjRegex.exec(decompressed)) !== null) {
        fullText += tj[1] + ' ';
      }

      // Extract text from hex: <hex> Tj
      const tjHexRegex = /<([0-9a-fA-F\s]+)>\s*Tj/g;
      let tjHex: RegExpExecArray | null;
      while ((tjHex = tjHexRegex.exec(decompressed)) !== null) {
        const clean = tjHex[1].replace(/\s+/g, '');
        let decoded = '';
        for (let k = 0; k < clean.length; k += 2) {
          decoded += String.fromCharCode(parseInt(clean.substr(k, 2), 16));
        }
        fullText += decoded + ' ';
      }

      // Extract text from text arrays: [(string) 20 (string)] TJ
      const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
      let tja: RegExpExecArray | null;
      while ((tja = tjArrayRegex.exec(decompressed)) !== null) {
        const parts = tja[1].match(/\(([^)]*)\)/g);
        if (parts) {
          fullText += parts.map((p) => p.slice(1, -1)).join('') + ' ';
        }
      }
    }

    if (!fullText.trim()) {
      const rawLiteralRegex = /\(([^)]+)\)/g;
      let rl: RegExpExecArray | null;
      while ((rl = rawLiteralRegex.exec(binary)) !== null) {
        if (rl[1].length > 3 && /[a-zA-Z0-9]/.test(rl[1])) {
          fullText += rl[1] + ' ';
        }
      }
    }

    return fullText;
  };

  const parseStudentsFromClientText = (
    text: string,
    yearVal: string,
    secVal: string,
    deptVal: string
  ) => {
    const rollRegex = /(?:^|[\s,;:(/\[|\t])([0-9]{2}[A-Za-z0-9]{2}[15A-Za-z][A-Za-z0-9]{5})(?=[\s,;:\"'\n\r)/\]|\t]|$)/gi;
    const matches: { roll: string; index: number }[] = [];
    let m: RegExpExecArray | null;

    while ((m = rollRegex.exec(text)) !== null) {
      const roll = m[1].toUpperCase();
      if (/[A-Z]/i.test(roll) && /\d/.test(roll)) {
        const matchIndex = m.index + m[0].indexOf(m[1]);
        const before = text.slice(Math.max(0, matchIndex - 1), matchIndex);
        const after = text.slice(matchIndex + roll.length, matchIndex + roll.length + 1);
        if (before !== '@' && after !== '@') {
          matches.push({ roll, index: matchIndex });
        }
      }
    }

    const students: any[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < matches.length; i++) {
      const curr = matches[i];
      if (seen.has(curr.roll)) continue;

      const startIndex = curr.index + curr.roll.length;
      const endIndex = i + 1 < matches.length ? matches[i + 1].index : text.length;
      let chunk = text.substring(startIndex, endIndex);

      const emailMatch = chunk.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
      const email = emailMatch ? emailMatch[1].toLowerCase() : `${curr.roll.toLowerCase()}@mictech.edu.in`;

      const phoneMatch = chunk.match(/\b([6-9]\d{9})\b/);
      const phone = phoneMatch ? phoneMatch[1] : null;

      let year = yearVal;
      if (/2nd\s*Year|second\s*year|\bII(?:\s*B\.?Tech)?\b/i.test(chunk)) year = '2nd Year';
      else if (/3rd\s*Year|third\s*year|\bIII(?:\s*B\.?Tech)?\b/i.test(chunk)) year = '3rd Year';
      else if (/4th\s*Year|final\s*year|\bIV(?:\s*B\.?Tech)?\b/i.test(chunk)) year = 'Final Year';

      let section = secVal;
      const secMatch = chunk.match(/Sec(?:tion)?[\s\n.:-]*([A-C])\b/i) || chunk.match(/\(([A-C])\)/i);
      if (secMatch) {
        section = secMatch[1].toUpperCase();
      } else if (curr.roll.startsWith('24H71A61')) {
        const lastPart = curr.roll.slice(-2);
        const num = parseInt(lastPart, 10);
        if (!isNaN(num) && num <= 66) section = 'A';
        else section = 'B';
      }

      let namePart = chunk;
      if (emailMatch) namePart = namePart.replace(emailMatch[0], ' ');
      if (phoneMatch) namePart = namePart.replace(phoneMatch[0], ' ');

      namePart = namePart.replace(/\b(?:ACTIVE|INACTIVE|PENDING|COMPLETED|VERIFIED|DONE)\b/gi, ' ');
      namePart = namePart.replace(/\b(?:3rd|2nd|4th|final)\s*year\b/gi, ' ');
      namePart = namePart.replace(/Class\s*&\s*Sec(?:tion)?/gi, ' ');
      namePart = namePart.replace(/\(?Sec(?:tion)?[\s\n.:-]*[A-C]\)?/gi, ' ');
      namePart = namePart.replace(/\b(?:B\.?Tech|Semester|Department|Artificial|Intelligence|Machine|Learning|AIML|AI&ML|CSE)\b/gi, ' ');
      namePart = namePart.replace(/\bPage\s*\d+\s*(?:of\s*\d+)?\b/gi, ' ');
      namePart = namePart.replace(/^\s*\d+[\s.)-]+/, ' ');
      namePart = namePart.replace(/[^a-zA-Z\s.-]/g, ' ');

      let cleanName = namePart.trim().replace(/\s+/g, ' ').replace(/^[-\s.]+|[-\s.]+$/g, '');
      if (!cleanName || cleanName.length < 2) cleanName = `Student ${curr.roll}`;
      if (cleanName.length > 50) cleanName = cleanName.slice(0, 50).trim();

      students.push({
        roll_number: curr.roll,
        name: cleanName,
        email,
        phone,
        year,
        section,
        department: deptVal,
      });
      seen.add(curr.roll);
    }
    return students;
  };

  const runClientSidePdfFallback = async (pdfFile: File, yearVal: string, secVal: string) => {
    try {
      const text = await extractTextFromPdfInBrowser(pdfFile);
      if (!text.trim()) {
        error('Could not extract readable text from PDF. Please ensure the document is not a scanned image.');
        setPreviewData(null);
        setParsedRows([]);
        return;
      }

      const students = parseStudentsFromClientText(text, yearVal, secVal, defaultDepartment);
      if (students.length === 0) {
        error('No student roll numbers could be detected in this PDF.');
        setPreviewData(null);
        setParsedRows([]);
        return;
      }

      setParsedRows(students);

      // Validate through dry run
      const valRes = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: students, isDryRun: true }),
      });

      if (valRes.ok) {
        const valData = await valRes.json();
        setPreviewData({
          ...valData,
          fileName: pdfFile.name,
          extractedCount: students.length,
          allValidRecords: students,
        });
        info(`Extracted ${students.length} students from PDF (${valData.validCount || students.length} valid)`);
      } else {
        const errJson = await valRes.json().catch(() => ({}));
        error(errJson.error || 'Validation failed for parsed records');
      }
    } catch (fbErr: any) {
      console.error('Client PDF fallback error:', fbErr);
      error(fbErr.message || 'Error processing PDF document');
      setPreviewData(null);
      setParsedRows([]);
    }
  };

  const processSelectedFile = (selectedFile: File) => {
    setFile(selectedFile);
    const isPdf = selectedFile.name.toLowerCase().endsWith('.pdf') || selectedFile.type === 'application/pdf';

    // Auto-detect year & section from filename if user uploaded nominal roll:
    // e.g. "III Year Students Rol List V-Sem-2026-2027-SEC A.pdf"
    let detectedYear = defaultYear;
    let detectedSec = defaultSection;
    const lowerName = selectedFile.name.toLowerCase();

    if (lowerName.includes('iii year') || lowerName.includes('3rd year') || lowerName.includes('v-sem') || lowerName.includes('v sem')) {
      detectedYear = '3rd Year';
      setDefaultYear('3rd Year');
    } else if (lowerName.includes('ii year') || lowerName.includes('2nd year') || lowerName.includes('iii-sem')) {
      detectedYear = '2nd Year';
      setDefaultYear('2nd Year');
    } else if (lowerName.includes('iv year') || lowerName.includes('4th year') || lowerName.includes('final year')) {
      detectedYear = 'Final Year';
      setDefaultYear('Final Year');
    }

    if (lowerName.includes('sec a') || lowerName.includes('section a') || lowerName.includes('sec-a')) {
      detectedSec = 'A';
      setDefaultSection('A');
    } else if (lowerName.includes('sec b') || lowerName.includes('section b') || lowerName.includes('sec-b')) {
      detectedSec = 'B';
      setDefaultSection('B');
    }

    if (isPdf) {
      setFileType('pdf');
      parsePdfFile(selectedFile, detectedYear, detectedSec);
    } else {
      setFileType('csv');
      parseCsvFile(selectedFile);
    }
  };

  const parsePdfFile = async (pdfFile: File, yearOverride?: string, secOverride?: string) => {
    setLoading(true);
    setPreviewData(null);
    const useYear = yearOverride || defaultYear;
    const useSec = secOverride || defaultSection;

    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('defaultYear', useYear);
      formData.append('defaultSection', useSec);
      formData.append('defaultDepartment', defaultDepartment);

      const res = await fetch('/api/import/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      let data: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      }

      if (res.ok && data?.success) {
        setPreviewData(data);
        setParsedRows(data.allValidRecords || data.validRows || []);
        info(`Extracted ${data.totalRecords} students from PDF (${data.validCount} valid)`);
        return;
      }

      // If server returned a client validation error (e.g. 422: no students), display exact message
      if (res.status === 422 && data?.error) {
        error(data.error);
        setPreviewData(null);
        setParsedRows([]);
        return;
      }

      // Fallback: If server returned an error (500, HTML page, Lambda crash), run client-side parser!
      console.warn('Server-side PDF route returned error, running client-side fallback...');
      await runClientSidePdfFallback(pdfFile, useYear, useSec);
    } catch (err: any) {
      console.warn('Network or server error during PDF parsing, running client-side fallback...', err);
      await runClientSidePdfFallback(pdfFile, useYear, useSec);
    } finally {
      setLoading(false);
    }
  };

  const parseCsvFile = (csvFile: File) => {
    setLoading(true);
    setPreviewData(null);
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        setParsedRows(rows);

        try {
          const res = await fetch('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ records: rows, isDryRun: true }),
          });
          const validation = await res.json();
          setPreviewData(validation);
        } catch {
          error('Validation failed');
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        error(`Failed to parse CSV: ${err.message}`);
        setLoading(false);
      },
    });
  };

  const handleReapplyPdfDefaults = () => {
    if (file && fileType === 'pdf') {
      parsePdfFile(file, defaultYear, defaultSection);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedRows || parsedRows.length === 0) {
      error('No valid records to import');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: parsedRows, isDryRun: false }),
      });

      const data = await res.json();
      if (res.ok) {
        success(`Successfully imported ${data.importedCount} students!`);
        onImportSuccess();
        onClose();
      } else {
        error(data.error || 'Import failed');
      }
    } catch {
      error('Import request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const resetSelection = () => {
    setFile(null);
    setFileType(null);
    setPreviewData(null);
    setParsedRows([]);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">Bulk Student Import</h3>
                <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200/60">
                  PDF &amp; CSV
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Upload college nominal roll (PDF) or spreadsheet (CSV)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 text-sm">
          {/* Sample templates banner */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-blue-900 space-y-0.5">
              <span className="font-extrabold block text-slate-900">Supported Import Formats</span>
              <p className="text-slate-600 text-[11px]">
                Accepts university nominal rolls, attendance sheets, and class lists.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/sample-students.pdf"
                download="sample-students.pdf"
                className="flex items-center gap-1 text-xs font-bold bg-white text-rose-700 hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl shadow-2xs transition-colors"
                title="Download sample PDF format"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>Sample PDF</span>
              </a>
              <a
                href="/sample-students.csv"
                download="sample-students.csv"
                className="flex items-center gap-1 text-xs font-bold bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl shadow-2xs transition-colors"
                title="Download sample CSV format"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Sample CSV</span>
              </a>
            </div>
          </div>

          {/* PDF Default Fallbacks (when not specified inside PDF) */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                Default Values (Used if missing from file):
              </span>
              {file && fileType === 'pdf' && (
                <button
                  onClick={handleReapplyPdfDefaults}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Re-parse with new defaults</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Academic Year
                </label>
                <select
                  value={defaultYear}
                  onChange={(e) => setDefaultYear(e.target.value)}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="3rd Year">3rd Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="Final Year">Final Year</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Section
                </label>
                <select
                  value={defaultSection}
                  onChange={(e) => setDefaultSection(e.target.value)}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="A">Section A (or Auto-detect)</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Department
                </label>
                <select
                  value={defaultDepartment}
                  onChange={(e) => setDefaultDepartment(e.target.value)}
                  className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Artificial Intelligence & Machine Learning">AIML Department</option>
                  <option value="Computer Science & Engineering">CSE Department</option>
                </select>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-5 sm:p-7 text-center transition-all bg-slate-50/50 hover:bg-blue-50/20 cursor-pointer relative group">
            <input
              type="file"
              accept=".pdf,.csv,.txt"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 group-hover:border-blue-300 text-blue-600 flex items-center justify-center mx-auto mb-2.5 shadow-xs group-hover:scale-110 transition-transform">
              {fileType === 'pdf' ? (
                <FileText className="w-6 h-6 text-rose-600" />
              ) : fileType === 'csv' ? (
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              ) : (
                <Upload className="w-6 h-6 text-blue-600" />
              )}
            </div>

            <div className="font-extrabold text-slate-800 text-sm">
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-blue-700">{file.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                    {fileType?.toUpperCase()}
                  </span>
                </div>
              ) : (
                'Click or Drag & Drop PDF / CSV File here'
              )}
            </div>

            <p className="text-[11px] text-slate-500 mt-1">
              Supports <strong className="text-slate-700">PDF documents (.pdf)</strong> and <strong className="text-slate-700">CSV spreadsheets (.csv)</strong>
            </p>

            {file && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  resetSelection();
                }}
                className="mt-2 text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors"
              >
                Change File
              </button>
            )}
          </div>

          {/* Validation & Preview section */}
          {loading && (
            <div className="p-8 text-center text-slate-500 text-xs space-y-2">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mx-auto" />
              <p className="font-semibold text-slate-700">Analyzing file and extracting student roll numbers...</p>
            </div>
          )}

          {previewData && !loading && (
            <div className="space-y-3 animate-in fade-in">
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Detected</div>
                  <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                    {previewData.totalRecords}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase">Ready to Add</div>
                  <div className="text-lg sm:text-xl font-black text-emerald-700 mt-0.5">
                    {previewData.validCount}
                  </div>
                </div>

                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-center">
                  <div className="text-[10px] font-bold text-rose-700 uppercase">Duplicate / Skip</div>
                  <div className="text-lg sm:text-xl font-black text-rose-700 mt-0.5">
                    {previewData.invalidCount}
                  </div>
                </div>
              </div>

              {/* Invalid Rows List */}
              {previewData.invalidRows && previewData.invalidRows.length > 0 && (
                <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-2xl">
                  <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Existing / Skipped Records ({previewData.invalidRows.length})</span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] text-rose-700">
                    {previewData.invalidRows.map((err: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold">{err.roll_number || 'Empty'}</span>
                        <span className="font-medium text-rose-800 text-[10px]">{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Valid Rows Preview */}
              {previewData.validRows && previewData.validRows.length > 0 && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Preview Extracted Students ({previewData.validRows.length} shown)</span>
                    <span className="text-[10px] font-semibold text-slate-500">Default pwd: student123</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-500 sticky top-0">
                        <tr>
                          <th className="p-2">Roll No</th>
                          <th className="p-2">Student Name</th>
                          <th className="p-2">Class</th>
                          <th className="p-2">Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewData.validRows.map((r: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold text-slate-800">{r.roll_number}</td>
                            <td className="p-2 font-semibold text-slate-700">{r.name}</td>
                            <td className="p-2 text-slate-600">
                              <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold text-[10px]">
                                {r.year} (Sec {r.section})
                              </span>
                            </td>
                            <td className="p-2 text-slate-500 text-[11px] truncate max-w-[140px]">{r.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!previewData || previewData.validCount === 0 || submitting}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {submitting
                ? 'Importing...'
                : previewData
                ? `Confirm Import (${previewData.validCount} Students)`
                : 'Confirm Import'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
