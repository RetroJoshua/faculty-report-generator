export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { generatePresignedUploadUrl } from '@/lib/s3';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fileName = body?.fileName ?? 'file';
    const contentType = body?.contentType ?? 'application/octet-stream';
    const isPublic = body?.isPublic ?? true;

    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(fileName, contentType, isPublic);
    return NextResponse.json({ uploadUrl, cloud_storage_path });
  } catch (error: any) {
    console.error('Presigned upload error:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
