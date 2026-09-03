import ImageKit from 'imagekit';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || 'public_RrwTUT/HBqI3BfuSCasFB0icxTA=';
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || 'private_qu7D8MS6ObCRf8Ni/xSeBmyr00o=';
const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/hodportal';

export const imagekit = new ImageKit({
  publicKey,
  privateKey,
  urlEndpoint,
});

export async function uploadToImageKit(
  fileBuffer: Buffer,
  fileName: string,
  folder: string = '/aiml_submissions'
): Promise<{ url: string; fileId: string; name: string }> {
  const base64File = fileBuffer.toString('base64');

  const response = await imagekit.upload({
    file: base64File,
    fileName,
    folder,
    useUniqueFileName: true,
  });

  return {
    url: response.url,
    fileId: response.fileId,
    name: response.name,
  };
}
