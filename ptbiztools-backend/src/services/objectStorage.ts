import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import type { Readable } from 'node:stream';

const bucketName = process.env.OBJECT_STORAGE_BUCKET?.trim() || '';
const region = process.env.OBJECT_STORAGE_REGION?.trim() || 'us-east-1';
const endpoint = process.env.OBJECT_STORAGE_ENDPOINT?.trim() || '';
const accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY_ID?.trim() || '';
const secretAccessKey = process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY?.trim() || '';
const keyPrefix = (process.env.OBJECT_STORAGE_PREFIX?.trim() || 'videos').replace(/^\/+|\/+$/g, '');
const forcePathStyle = (process.env.OBJECT_STORAGE_FORCE_PATH_STYLE || 'false').toLowerCase() === 'true';

let s3Client: S3Client | null = null;

function getS3Client() {
  if (!bucketName) {
    throw new Error('OBJECT_STORAGE_BUCKET is required for object storage uploads');
  }

  if (s3Client) return s3Client;

  s3Client = new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle,
    credentials: accessKeyId && secretAccessKey
      ? {
          accessKeyId,
          secretAccessKey,
        }
      : undefined,
  });

  return s3Client;
}

function normalizeAssetName(name: string) {
  const normalized = name.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,80}$/.test(normalized)) {
    throw new Error('Invalid asset name. Use only letters, numbers, dashes, and underscores.');
  }
  return normalized;
}

function getObjectKey(assetName: string) {
  return `${keyPrefix}/${normalizeAssetName(assetName)}`;
}

function isNotFoundError(error: unknown) {
  const candidate = error as {
    name?: string;
    Code?: string;
    code?: string;
    $metadata?: { httpStatusCode?: number };
  };

  const status = candidate?.$metadata?.httpStatusCode;
  const name = candidate?.name || candidate?.Code || candidate?.code;

  return status === 404 || name === 'NotFound' || name === 'NoSuchKey';
}

export function isObjectStorageEnabled() {
  return Boolean(bucketName);
}

export interface VideoObjectHead {
  exists: boolean;
  key: string;
  contentType?: string;
  contentLength?: number;
  etag?: string;
}

export interface VideoObjectData {
  key: string;
  body?: Readable;
  contentType?: string;
  contentLength?: number;
  etag?: string;
}

export async function headVideoObject(assetName: string): Promise<VideoObjectHead> {
  const key = getObjectKey(assetName);
  const client = getS3Client();

  try {
    const result = await client.send(new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    }));

    return {
      exists: true,
      key,
      contentType: result.ContentType,
      contentLength: result.ContentLength,
      etag: result.ETag,
    };
  } catch (error) {
    if (isNotFoundError(error)) {
      return { exists: false, key };
    }
    throw error;
  }
}

export async function getVideoObject(assetName: string): Promise<VideoObjectData> {
  const key = getObjectKey(assetName);
  const client = getS3Client();

  const result = await client.send(new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  }));

  return {
    key,
    body: result.Body as Readable | undefined,
    contentType: result.ContentType,
    contentLength: result.ContentLength,
    etag: result.ETag,
  };
}

export async function uploadVideoObject(input: {
  assetName: string;
  body: Buffer | Readable;
  contentType: string;
  contentLength?: number;
}) {
  const key = getObjectKey(input.assetName);
  const client = getS3Client();

  const uploader = new Upload({
    client,
    queueSize: 4,
    partSize: 8 * 1024 * 1024,
    leavePartsOnError: false,
    params: {
      Bucket: bucketName,
      Key: key,
      Body: input.body,
      ContentType: input.contentType,
      ContentLength: input.contentLength,
      Metadata: {
        asset: normalizeAssetName(input.assetName),
      },
    },
  });

  await uploader.done();

  return {
    bucket: bucketName,
    key,
  };
}
