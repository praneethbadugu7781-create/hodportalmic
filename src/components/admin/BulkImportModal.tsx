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
} from 'lucide-react';
import { useToast } from '../ui/Toast';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export function BulkImportModal({ isOpen, onClose, onImportSuccess }: BulkImportModalProps) {
  const { success, error, info } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = (fileToParse: File) => {
    setLoading(true);
    Papa.parse(fileToParse, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        setParsedRows(rows);

        // Run dry-run validation against server
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

  const handleConfirmImport = async () => {
    if (!parsedRows || parsedRows.length === 0) {
      error('No records to import');
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

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Bulk Student Import</h3>
              <p className="text-xs text-slate-500">Upload CSV file to import multiple students</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold text-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {/* Sample template download link */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
            <div className="text-xs text-blue-900">
              <span className="font-bold block">Need standard CSV format?</span>
              Columns: <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-800">Roll Number, Name, Email, Phone, Year, Section</code>
            </div>
            <a
              href="/sample-students.csv"
              download="sample-students.csv"
              className="flex items-center gap-1.5 text-xs font-bold bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sample CSV</span>
            </a>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center transition-colors bg-slate-50/50 cursor-pointer relative">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <div className="font-bold text-slate-800 text-sm">
              {file ? file.name : 'Click or Drag & Drop CSV File here'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Supports standard UTF-8 CSV exports from Excel or Google Sheets
            </p>
          </div>

          {/* Validation & Preview section */}
          {loading && (
            <div className="p-8 text-center text-slate-500 text-xs">
              Analyzing and validating student records...
            </div>
          )}

          {previewData && !loading && (
            <div className="space-y-3 animate-in fade-in">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Total in File</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    {previewData.totalRecords}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase">Valid to Add</div>
                  <div className="text-lg font-bold text-emerald-700 mt-0.5">
                    {previewData.validCount}
                  </div>
                </div>

                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
                  <div className="text-[10px] font-bold text-rose-700 uppercase">Invalid / Skipped</div>
                  <div className="text-lg font-bold text-rose-700 mt-0.5">
                    {previewData.invalidCount}
                  </div>
                </div>
              </div>

              {/* Invalid Rows List */}
              {previewData.invalidRows && previewData.invalidRows.length > 0 && (
                <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
                  <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Issues Detected ({previewData.invalidRows.length})</span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] text-rose-700">
                    {previewData.invalidRows.map((err: any, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <span>Row {err.row}: Roll "{err.roll_number || 'Empty'}"</span>
                        <span className="font-semibold">{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Valid Rows Preview */}
              {previewData.validRows && previewData.validRows.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                    Preview Sample Records ({previewData.validRows.length} shown)
                  </div>
                  <div className="max-h-36 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <tbody className="divide-y divide-slate-100">
                        {previewData.validRows.map((r: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold text-slate-800">{r.roll_number}</td>
                            <td className="p-2 font-semibold text-slate-700">{r.name}</td>
                            <td className="p-2 text-slate-500">{r.year}</td>
                            <td className="p-2 font-bold text-blue-600">Sec {r.section}</td>
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
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!previewData || previewData.validCount === 0 || submitting}
            className="flex items-center gap-1.5 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs"
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
