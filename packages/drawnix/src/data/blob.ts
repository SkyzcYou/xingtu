import { PlaitBoard } from '@plait/core';
import { isValidDrawnixData } from './drawnix-data-validation';
import { IMAGE_MIME_TYPES, MIME_TYPES } from '../constants';
import { ASSET_CONSTANTS } from '../constants/ASSET_CONSTANTS';
import { ValueOf } from '@aitu/utils';
import { DataURL } from '../types';
import { DrawnixExportedData } from './types';
import { restoreEmbeddedMedia } from './embedded-media';
export { restoreEmbeddedMedia };

export const loadFromBlob = async (board: PlaitBoard, blob: Blob | File) => {
  const contents = await parseFileContents(blob);
  let data: DrawnixExportedData;
  try {
    data = JSON.parse(contents);
    if (isValidDrawnixData(data)) {
      // 如果存在嵌入的媒体数据，先恢复它们
      await restoreEmbeddedMedia(data.embeddedMedia);
      return data;
    }
    throw new Error('Error: invalid file');
  } catch (error: any) {
    throw new Error('Error: invalid file');
  }
};

export const createFile = (
  blob: File | Blob | ArrayBuffer,
  mimeType: ValueOf<typeof MIME_TYPES>,
  name: string | undefined
) => {
  return new File([blob], name || '', {
    type: mimeType,
  });
};

export const blobToArrayBuffer = (blob: Blob): Promise<ArrayBuffer> => {
  if ('arrayBuffer' in blob) {
    return blob.arrayBuffer();
  }
  // Safari
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) {
        return reject(new Error("Couldn't convert blob to ArrayBuffer"));
      }
      resolve(event.target.result as ArrayBuffer);
    };
    reader.readAsArrayBuffer(blob);
  });
};

export const normalizeFile = async (file: File) => {
  if (!file.type) {
    if (file?.name?.endsWith('.drawnix')) {
      file = createFile(
        await blobToArrayBuffer(file),
        MIME_TYPES.drawnix,
        file.name
      );
    }
  }
  return file;
};

export const parseFileContents = async (blob: Blob | File) => {
  let contents: string;
  if ('text' in Blob) {
    contents = await blob.text();
  } else {
    contents = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsText(blob, 'utf8');
      reader.onloadend = () => {
        if (reader.readyState === FileReader.DONE) {
          resolve(reader.result as string);
        }
      };
    });
  }
  return contents;
};

export const getDataURL = async (file: Blob | File): Promise<DataURL> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataURL = reader.result as DataURL;
      resolve(dataURL);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const isSupportedImageFileType = (type: string | null | undefined) => {
  return !!type && (Object.values(IMAGE_MIME_TYPES) as string[]).includes(type);
};

export const isSupportedImageFile = (
  blob: Blob | null | undefined
): blob is Blob & { type: ValueOf<typeof IMAGE_MIME_TYPES> } => {
  const { type } = blob || {};
  return isSupportedImageFileType(type);
};

const AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/flac'];
const VIDEO_EXTENSION_MIME_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogg: 'video/ogg',
  ogv: 'video/ogg',
  mov: 'video/quicktime',
  qt: 'video/quicktime',
  m4v: 'video/x-m4v',
};

export const isSupportedAudioFileType = (type: string | null | undefined) => {
  return !!type && AUDIO_MIME_TYPES.includes(type);
};

export const isSupportedVideoFileType = (type: string | null | undefined) => {
  return !!type && ASSET_CONSTANTS.ALLOWED_VIDEO_TYPES.includes(type as any);
};

export const getSupportedVideoFileMimeType = (
  file: File | null | undefined
): string | null => {
  if (!file) {
    return null;
  }

  if (isSupportedVideoFileType(file.type)) {
    return file.type;
  }

  const extension = file.name?.split('.').pop()?.toLowerCase();
  const fallbackMimeType = extension
    ? VIDEO_EXTENSION_MIME_TYPES[extension]
    : undefined;
  return isSupportedVideoFileType(fallbackMimeType) ? fallbackMimeType! : null;
};
