import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { uploadToImageKit } from '@/lib/imagekit';
import path from 'path';

export const dynamic = 'force-dynamic';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx', '.webp'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export async function POST(req: NextRequest) {
  try {
    const { user, student, session } = await getAuthenticatedUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please login to upload files.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds maximum allowed limit of 15MB.' }, { status: 400 });
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

    const studentRoll = student?.roll_number || user?.username || 'upload';
    const cleanFileName = `${studentRoll}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // Upload directly to ImageKit Cloud
    const result = await uploadToImageKit(buffer, cleanFileName, '/aiml_student_proofs');

    return NextResponse.json({
      success: true,
      url: result.url,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      imageKitFileId: result.fileId,
    });
  } catch (error: any) {
    console.error('ImageKit File upload error:', error);
    return NextResponse.json({ error: error.message || 'ImageKit file upload failed' }, { status: 500 });
  }
}
