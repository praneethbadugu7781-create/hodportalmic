import JSZip from 'jszip';

export interface SubmissionItem {
  student_id: string;
  roll_number: string;
  name: string;
  year?: string;
  section?: string;
  submission_file_url?: string | null;
  submission_file_name?: string | null;
  submission_submitted_at?: string | Date | null;
}

export interface ZipExportProgress {
  current: number;
  total: number;
  percent: number;
  currentFile: string;
  statusText: string;
}

export async function downloadSubmissionsZip(
  taskTitle: string,
  submissions: SubmissionItem[],
  onProgress?: (progress: ZipExportProgress) => void
): Promise<{ success: boolean; downloadedCount: number; failedCount: number; zipSizeMb: number }> {
  // Filter submissions with uploaded files
  const fileSubmissions = submissions.filter(
    (s) => s.submission_file_url && typeof s.submission_file_url === 'string'
  );

  if (fileSubmissions.length === 0) {
    throw new Error('No uploaded files found for this task.');
  }

  const zip = new JSZip();
  const folderA = zip.folder('Section_A');
  const folderB = zip.folder('Section_B');
  const folderGeneral = zip.folder('General');

  const manifestRows: string[] = [
    'Roll Number,Student Name,Academic Year,Section,File Name,Submission Date,File URL,Download Status',
  ];

  let downloadedCount = 0;
  let failedCount = 0;
  const total = fileSubmissions.length;

  onProgress?.({
    current: 0,
    total,
    percent: 0,
    currentFile: 'Initializing zip package...',
    statusText: `Preparing to download ${total} submission files...`,
  });

  // Batch download helper to avoid socket starvation
  const CONCURRENCY = 4;
  for (let i = 0; i < fileSubmissions.length; i += CONCURRENCY) {
    const batch = fileSubmissions.slice(i, i + CONCURRENCY);

    await Promise.all(
      batch.map(async (item, batchIdx) => {
        const fileIdx = i + batchIdx + 1;
        const roll = item.roll_number || 'UNKNOWN';
        const name = (item.name || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
        const rawFileName = item.submission_file_name || 'submission.pdf';
        const fileExt = rawFileName.includes('.') ? rawFileName.split('.').pop() : 'pdf';
        const cleanFileName = `${roll}_${name}.${fileExt}`;

        onProgress?.({
          current: fileIdx,
          total,
          percent: Math.round((fileIdx / total) * 85), // reserve 85-100% for zip generation
          currentFile: cleanFileName,
          statusText: `Downloading file ${fileIdx} of ${total}: ${cleanFileName}`,
        });

        try {
          const res = await fetch(item.submission_file_url!);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const arrayBuffer = await res.arrayBuffer();

          const targetFolder =
            item.section === 'A'
              ? folderA
              : item.section === 'B'
              ? folderB
              : folderGeneral;

          targetFolder?.file(cleanFileName, arrayBuffer);
          downloadedCount++;

          const dateStr = item.submission_submitted_at
            ? new Date(item.submission_submitted_at).toISOString()
            : 'N/A';

          manifestRows.push(
            `"${roll}","${item.name || ''}","${item.year || ''}","${item.section || ''}","${cleanFileName}","${dateStr}","${item.submission_file_url}","SUCCESS"`
          );
        } catch (err: any) {
          console.warn(`Failed to download file for ${roll}:`, err.message);
          failedCount++;
          manifestRows.push(
            `"${roll}","${item.name || ''}","${item.year || ''}","${item.section || ''}","${cleanFileName}","N/A","${item.submission_file_url}","FAILED: ${err.message}"`
          );
        }
      })
    );
  }

  // Add Manifest CSV
  zip.file('Submission_Manifest.csv', manifestRows.join('\n'));

  // Compress and generate zip
  onProgress?.({
    current: total,
    total,
    percent: 90,
    currentFile: 'Compressing archive...',
    statusText: 'Generating and compressing ZIP package...',
  });

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }, (metadata) => {
    onProgress?.({
      current: total,
      total,
      percent: 90 + Math.round(metadata.percent / 10),
      currentFile: 'Compressing archive...',
      statusText: `Compressing ZIP file (${Math.round(metadata.percent)}%)...`,
    });
  });

  onProgress?.({
    current: total,
    total,
    percent: 100,
    currentFile: 'Complete',
    statusText: 'Download ready! Saving to your computer...',
  });

  // Trigger browser download
  const cleanTitle = taskTitle.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const downloadFileName = `AIML_${cleanTitle}_Submissions_${dateStamp}.zip`;

  const blobUrl = URL.createObjectURL(zipBlob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = downloadFileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 10000);

  const zipSizeMb = +(zipBlob.size / (1024 * 1024)).toFixed(2);
  return { success: true, downloadedCount, failedCount, zipSizeMb };
}
