import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { uploadToImageKit } from '@/lib/imagekit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';

export const dynamic = 'force-dynamic';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

// Default MIC College standard 7-period time slots
const DEFAULT_PERIOD_TIMES = [
  { period_number: 1, start_time: '09:15', end_time: '10:05' },
  { period_number: 2, start_time: '10:05', end_time: '10:55' },
  { period_number: 3, start_time: '11:05', end_time: '11:55' },
  { period_number: 4, start_time: '11:55', end_time: '12:45' },
  // Lunch 12:45 - 01:35
  { period_number: 5, start_time: '13:35', end_time: '14:25' },
  { period_number: 6, start_time: '14:25', end_time: '15:15' },
  { period_number: 7, start_time: '15:15', end_time: '16:05' },
];

const STANDARD_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

function getDefaultScheduleTemplate() {
  return STANDARD_DAYS.map((day) => ({
    day,
    periods: DEFAULT_PERIOD_TIMES.map((slot) => ({
      period_number: slot.period_number,
      start_time: slot.start_time,
      end_time: slot.end_time,
      subject_name: '',
      subject_code: '',
      faculty_name: '',
      room_number: '',
      is_lab: false,
    })),
  }));
}

export async function POST(req: NextRequest) {
  try {
    const { user, session } = await getAuthenticatedUser(req);
    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin privileges required.' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const year = (formData.get('year') as string) || '2nd Year';
    const section = ((formData.get('section') as string) || 'A').toUpperCase();

    if (!file) {
      return NextResponse.json({ error: 'No image or PDF file uploaded.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds maximum limit of 15MB.' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `File type not supported. Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Upload to ImageKit permanently
    const cleanFileName = `timetable_${year.replace(/\s+/g, '_')}_Sec${section}_${Date.now()}${ext}`;
    let uploadedImageUrl: string | null = null;
    try {
      const uploadRes = await uploadToImageKit(buffer, cleanFileName, '/aiml_timetables');
      uploadedImageUrl = uploadRes.url;
    } catch (uploadErr) {
      console.warn('ImageKit upload warning (proceeding with extraction):', uploadErr);
    }

    // 2. AI Extraction via Gemini Vision
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    let extractedSchedule: any[] | null = null;
    let extractedSemester = 'II-I';
    let aiSuccess = false;

    if (geminiKey && !file.name.endsWith('.pdf')) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        // Use active gemini-3.6-flash model with automatic fallback to gemini-flash-latest
        const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

        const prompt = `
You are an expert OCR timetable parser for DVR & Dr. HS MIC College of Technology (Department of Artificial Intelligence & Machine Learning).
Analyze this timetable image and extract the class schedule into a STRICT JSON object with no markdown formatting or commentary.

Instructions:
1. Identify the Class / Semester header (e.g. 'III/V- A' or 'II/III- B').
2. Look at the Course Table / Faculty Legend at the bottom of the sheet to expand abbreviations:
   - e.g. DL -> 'Deep Learning', CN -> 'Computer Networks', OS -> 'Operating Systems', EDVC -> 'Entrepreneurship Development and Venture Creation', FSD-2 -> 'Full Stack Development -2', UI F LAB -> 'User Interface Design using Flutter Lab', PT-C -> 'P & T Coding', PT-V -> 'P & T Verbal Ability', MOOCS -> 'MOOCS - NPTEL', SEMINAR -> 'Technical Seminar'.
   - Associate the corresponding Faculty Name and Course Code from the legend to each period.
3. Mark multi-period lab sessions with is_lab: true.
4. Extract the exact start_time and end_time (e.g. '09:00', '10:00', '11:10', '12:00', '13:40', '14:30', '15:20', '16:10').

The JSON MUST match this exact schema:
{
  "semester": "string (e.g. 'III/V- A')",
  "days": [
    {
      "day": "Monday | Tuesday | Wednesday | Thursday | Friday | Saturday",
      "periods": [
        {
          "period_number": 1,
          "start_time": "HH:MM (e.g. 09:00)",
          "end_time": "HH:MM (e.g. 10:00)",
          "subject_name": "Full subject name (expanded from abbreviation)",
          "subject_code": "code if available (e.g. 23AM5T01)",
          "faculty_name": "Full faculty name from legend (e.g. Mrs. K. Nasaramma)",
          "room_number": "Room or Lab number if visible",
          "is_lab": boolean
        }
      ]
    }
  ]
}

Ensure all days (Monday to Saturday) present in the timetable are included.
Return ONLY valid JSON with no markdown wrapping.
`;

        const mimeType = file.type || (ext === '.png' ? 'image/png' : 'image/jpeg');
        const imagePart = {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType,
          },
        };

        let result;
        try {
          result = await model.generateContent([prompt, imagePart]);
        } catch {
          const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
          result = await fallbackModel.generateContent([prompt, imagePart]);
        }

        const responseText = result.response.text();

        // Strip code block fences if present
        const jsonText = responseText
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();

        const parsed = JSON.parse(jsonText);
        if (parsed && Array.isArray(parsed.days) && parsed.days.length > 0) {
          extractedSchedule = parsed.days;
          if (parsed.semester) extractedSemester = parsed.semester;
          aiSuccess = true;
        }
      } catch (geminiError: any) {
        console.warn('Gemini vision extraction warning:', geminiError?.message || geminiError);
      }
    }

    // If AI was not enabled or failed, provide the standard pre-timed departmental template
    if (!extractedSchedule || extractedSchedule.length === 0) {
      extractedSchedule = getDefaultScheduleTemplate();
    }

    return NextResponse.json({
      success: true,
      imageUrl: uploadedImageUrl,
      semester: extractedSemester,
      schedule: extractedSchedule,
      aiSuccess,
      fileName: file.name,
      message: aiSuccess
        ? 'Timetable classes extracted successfully by AI. Please review the preview below and click Publish.'
        : 'Timetable image uploaded. Standard period grid loaded for your review and edits.',
    });
  } catch (error: any) {
    console.error('Error in /api/timetable/extract:', error);
    return NextResponse.json({ error: error.message || 'Failed to process timetable image' }, { status: 500 });
  }
}
