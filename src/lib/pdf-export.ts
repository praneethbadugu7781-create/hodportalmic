import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, Task } from './types';
import { formatDate } from './utils';

// Helper to convert image URL to base64 for jsPDF embedding
async function getBase64ImageFromUrl(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Generates a Premium Official Student Directory PDF Report with MIC College Logo
 */
export async function exportStudentsPdf(
  students: Student[],
  filterInfo: { year?: string; section?: string; status?: string } = {}
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoBase64 = await getBase64ImageFromUrl('/logo-mic.png');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top Decorative Bar
  doc.setFillColor(14, 59, 156); // Deep Royal Blue (#0e3b9c)
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Embed Logo Image
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 14, 10, 48, 16);
    } catch {
      // ignore
    }
  }

  // Header Title & Department on Right/Center
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(14, 59, 156);
  doc.text('Department of Artificial Intelligence & Machine Learning', pageWidth - 14, 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Academic Session: 2026-27 | Student Directory & Enrollment Record', pageWidth - 14, 21, { align: 'right' });

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 29, pageWidth - 14, 29);

  // Report Summary Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 33, pageWidth - 28, 20, 3, 3, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 33, pageWidth - 28, 20, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('OFFICIAL AIML STUDENT ENROLLMENT DIRECTORY', 18, 41);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const filterDesc = `Filter: ${filterInfo.year || 'All Years'} | Section: ${filterInfo.section || 'All Sections'} | Status: ${filterInfo.status || 'Active'}`;
  doc.text(filterDesc, 18, 47);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(14, 59, 156);
  doc.text(`Total Records: ${students.length}`, pageWidth - 18, 41, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageWidth - 18, 47, { align: 'right' });

  // Student Table
  const tableData = students.map((s, idx) => [
    idx + 1,
    s.roll_number,
    s.name,
    `${s.year} (Sec ${s.section})`,
    s.email,
    s.phone || 'N/A',
    s.status || 'ACTIVE',
  ]);

  autoTable(doc, {
    startY: 57,
    head: [['#', 'Roll Number', 'Student Name', 'Class & Sec', 'College Email ID', 'Phone No', 'Status']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [14, 59, 156],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { fontStyle: 'bold', halign: 'center', cellWidth: 26 },
      2: { fontStyle: 'bold', cellWidth: 42 },
      3: { halign: 'center', cellWidth: 24 },
      4: { cellWidth: 48 },
      5: { halign: 'center', cellWidth: 22 },
      6: { halign: 'center', cellWidth: 16 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 20 },
    didDrawPage: (data) => {
      // Footer on every page
      const footerY = pageHeight - 10;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'DVR & Dr. HS MIC College of Technology (Autonomous) • Dept. of AIML',
        14,
        footerY
      );
      const pageStr = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`;
      doc.text(pageStr, pageWidth - 14, footerY, { align: 'right' });
    },
  });

  // Save PDF
  doc.save(`MIC_AIML_Students_Directory_${Date.now()}.pdf`);
}

/**
 * Generates a Premium Task Compliance & Pending Roll Numbers PDF Report
 */
export async function exportTaskReportPdf(
  task: any,
  completedList: any[],
  notCompletedList: any[]
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoBase64 = await getBase64ImageFromUrl('/logo-mic.png');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top Bar
  doc.setFillColor(14, 59, 156);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Logo
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 14, 10, 48, 16);
    } catch {
      // ignore
    }
  }

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(14, 59, 156);
  doc.text('Department of Artificial Intelligence & Machine Learning', pageWidth - 14, 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TASK COMPLIANCE & SUBMISSION STATUS REPORT', pageWidth - 14, 21, { align: 'right' });

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 29, pageWidth - 14, 29);

  // Task Details Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 33, pageWidth - 28, 28, 3, 3, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 33, pageWidth - 28, 28, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(task.title || 'Department Task Report', 18, 41);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Type: ${task.type?.replace('_', ' ')} | Priority: ${task.priority || 'MEDIUM'} | Deadline: ${formatDate(task.deadline)}`, 18, 48);

  const total = completedList.length + notCompletedList.length;
  const rate = total > 0 ? Math.round((completedList.length / total) * 100) : 0;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(14, 59, 156);
  doc.text(`Compliance Rate: ${rate}%`, pageWidth - 18, 41, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Assigned: ${total} | Done: ${completedList.length} | Pending: ${notCompletedList.length}`, pageWidth - 18, 48, { align: 'right' });

  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 18, 55);

  let currentY = 66;

  // 1. PENDING STUDENTS SECTION
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(225, 29, 72); // Rose/Red
  doc.text(`PENDING STUDENTS (${notCompletedList.length} Awaiting Submission)`, 14, currentY);

  const pendingTableData = notCompletedList.map((s, idx) => [
    idx + 1,
    s.roll_number,
    s.name,
    `${s.year} (Sec ${s.section})`,
    s.email,
    s.phone || 'N/A',
    s.assignment_status || 'PENDING',
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['#', 'Roll Number', 'Student Name', 'Class & Sec', 'College Email', 'Phone No', 'Status']],
    body: pendingTableData.length > 0 ? pendingTableData : [['-', 'None', 'All students completed!', '-', '-', '-', 'DONE']],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { fontStyle: 'bold', halign: 'center', cellWidth: 26 },
      2: { fontStyle: 'bold', cellWidth: 42 },
      3: { halign: 'center', cellWidth: 24 },
      4: { cellWidth: 48 },
      5: { halign: 'center', cellWidth: 22 },
      6: { halign: 'center', cellWidth: 16 },
    },
    margin: { left: 14, right: 14, bottom: 20 },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 120;

  // 2. COMPLETED STUDENTS SECTION
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // Emerald Green
  doc.text(`COMPLETED SUBMISSIONS (${completedList.length} Verified)`, 14, finalY + 10);

  const completedTableData = completedList.map((s, idx) => [
    idx + 1,
    s.roll_number,
    s.name,
    `${s.year} (Sec ${s.section})`,
    formatDate(s.completed_at || s.submission_submitted_at),
    s.submission_file_url ? 'Proof Uploaded' : 'Yes/Confirmed',
    'VERIFIED',
  ]);

  autoTable(doc, {
    startY: finalY + 13,
    head: [['#', 'Roll Number', 'Student Name', 'Class & Sec', 'Submitted At', 'Submission Proof', 'Status']],
    body: completedTableData.length > 0 ? completedTableData : [['-', 'None', 'No submissions yet', '-', '-', '-', 'PENDING']],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { fontStyle: 'bold', halign: 'center', cellWidth: 26 },
      2: { fontStyle: 'bold', cellWidth: 42 },
      3: { halign: 'center', cellWidth: 24 },
      4: { halign: 'center', cellWidth: 32 },
      5: { halign: 'center', cellWidth: 34 },
      6: { halign: 'center', cellWidth: 20 },
    },
    margin: { left: 14, right: 14, bottom: 20 },
    didDrawPage: (data) => {
      const footerY = pageHeight - 10;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('DVR & Dr. HS MIC College of Technology (Autonomous) • Dept. of AIML', 14, footerY);
      const pageStr = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`;
      doc.text(pageStr, pageWidth - 14, footerY, { align: 'right' });
    },
  });

  doc.save(`MIC_AIML_Task_Report_${task.title?.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`);
}

export interface SubmissionReceiptData {
  student: {
    roll_number: string;
    name: string;
    year: string;
    section: string;
    department?: string;
    email?: string;
  };
  task: {
    id: string | number;
    title: string;
    description?: string;
    type: string;
    deadline: string | Date;
  };
  submission: {
    response?: string | null;
    file_url?: string | null;
    file_name?: string | null;
    submitted_at?: string | Date | null;
    completed_at?: string | Date | null;
  };
}

/**
 * Generates an Official Departmental Student Submission Receipt & Acknowledgment Pass
 */
export async function exportSubmissionReceiptPdf(data: SubmissionReceiptData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoBase64 = await getBase64ImageFromUrl('/logo-mic.png');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top Deep Blue Brand Accent Bar
  doc.setFillColor(14, 59, 156);
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Embed Logo Image
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 14, 12, 44, 15);
    } catch {}
  }

  // Header Titles
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(14, 59, 156);
  doc.text('DVR & Dr. HS MIC College of Technology', pageWidth - 14, 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('(Autonomous Institution | Approved by AICTE, Affiliated to JNTUK)', pageWidth - 14, 21, { align: 'right' });
  doc.text('Department of Artificial Intelligence & Machine Learning (AIML)', pageWidth - 14, 26, { align: 'right' });

  // Divider Line
  doc.setDrawColor(203, 213, 225);
  doc.line(14, 32, pageWidth - 14, 32);

  // Receipt Title Banner
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 36, pageWidth - 28, 14, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('OFFICIAL SUBMISSION RECEIPT & ACKNOWLEDGMENT PASS', pageWidth / 2, 45, { align: 'center' });

  const refNumber = `MIC-AIML-${String(data.task.id).slice(-6).toUpperCase()}-${data.student.roll_number}`;
  const submittedDate = formatDate(data.submission.completed_at || data.submission.submitted_at || new Date());

  // Verified Badge Card
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(14, 54, pageWidth - 28, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(4, 120, 87);
  doc.text('✓ STATUS: COMPLETED & VERIFIED ON DEPT SYSTEM', 20, 62);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 118, 110);
  doc.text(`Acknowledgment Ref: ${refNumber}  |  Submitted On: ${submittedDate}`, 20, 68);

  // Student Information Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Student Identification', 14, 80);

  autoTable(doc, {
    startY: 83,
    head: [['Roll Number', 'Full Name', 'Academic Year & Section', 'Department']],
    body: [
      [
        data.student.roll_number,
        data.student.name,
        `${data.student.year} (Section ${data.student.section})`,
        data.student.department || 'Artificial Intelligence & Machine Learning',
      ],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3, textColor: [30, 41, 59] },
    headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
  });

  const finalY1 = (doc as any).lastAutoTable.finalY || 105;

  // Task & Submission Details Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Submission & Compliance Particulars', 14, finalY1 + 10);

  const proofValue = data.submission.file_name
    ? `File Uploaded: ${data.submission.file_name}`
    : data.submission.file_url
    ? 'File Proof Verified'
    : data.submission.response || 'Confirmed / Completed';

  autoTable(doc, {
    startY: finalY1 + 13,
    body: [
      ['Activity / Task Title', data.task.title],
      ['Activity Type', data.task.type.replace('_', ' ')],
      ['Assigned Deadline', formatDate(data.task.deadline)],
      ['Submission Response / Proof', proofValue],
      ['Compliance State', 'COMPLETED (Requirements Satisfied)'],
      ['Digital Record ID', refNumber],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 60 },
      1: { cellWidth: pageWidth - 28 - 60 },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY2 = (doc as any).lastAutoTable.finalY || 180;

  // Notice Note Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, finalY2 + 8, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('NOTICE & VERIFICATION POLICY:', 18, finalY2 + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'This electronic receipt is computer-generated proof of submission stored securely on the AIML Department Repository.',
    18,
    finalY2 + 19
  );
  doc.text(
    'Students may present this slip to class coordinators or faculty incharge as authentic confirmation of task compliance.',
    18,
    finalY2 + 24
  );

  // Official Signature Block
  const sigY = finalY2 + 45;

  doc.setDrawColor(203, 213, 225);
  doc.line(14, sigY + 12, 65, sigY + 12);
  doc.line(pageWidth - 75, sigY + 12, pageWidth - 14, sigY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Student Signature / Acknowledgment', 14, sigY + 17);
  doc.text('Head of Department (AIML)', pageWidth - 14, sigY + 17, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Roll No: ${data.student.roll_number}`, 14, sigY + 21);
  doc.text('DVR & Dr. HS MIC College of Technology', pageWidth - 14, sigY + 21, { align: 'right' });

  // Footer
  const footerY = pageHeight - 10;
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `DVR & Dr. HS MIC College of Technology • AIML Dept. • Generated on ${new Date().toLocaleString()}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  doc.save(`MIC_AIML_Receipt_${data.student.roll_number}_${data.task.id}.pdf`);
}

