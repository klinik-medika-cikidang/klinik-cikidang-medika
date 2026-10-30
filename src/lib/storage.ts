import { createClient } from './supabase/client';
import { getErrorMessage } from './utils';

export type StorageProvider = 'supabase' | 'cloudinary';

export interface UploadPhotoResult {
  url: string;
  provider: StorageProvider;
  path: string;
}

/**
 * Kompres gambar sisi klien ke format WebP < 300KB
 */
export async function compressImageToWebP(file: File, maxSizeBytes: number = 300 * 1024): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Batasi resolusi maksimal 1600px untuk menghemat ukuran file medis
      const maxDim = 1600;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context tidak tersedia'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.85;
      const tryCompress = (q: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Gagal mengompres gambar'));
              return;
            }
            if (blob.size <= maxSizeBytes || q <= 0.3) {
              resolve(blob);
            } else {
              tryCompress(q - 0.15);
            }
          },
          'image/webp',
          q
        );
      };

      tryCompress(quality);
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Upload foto medis ke Supabase Storage (Default) atau Cloudinary (Fallback jika kuota penuh)
 */
export async function uploadMedicalPhoto(
  file: File | Blob,
  pasienId: string,
  tindakanId: string,
  preferredProvider: StorageProvider = 'supabase'
): Promise<UploadPhotoResult> {
  const compressedBlob =
    file.type === 'image/webp' && file.size <= 300 * 1024
      ? file
      : await compressImageToWebP(file as File);
  const timestamp = Date.now();
  const filename = `${pasienId}/${tindakanId}_${timestamp}.webp`;

  // 2. Upload via Supabase Storage
  if (preferredProvider === 'supabase') {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('medical-photos')
        .upload(filename, compressedBlob, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Ambil signed URL privat (berlaku 1 jam)
      const { data: signedData } = await supabase.storage
        .from('medical-photos')
        .createSignedUrl(data.path, 3600);

      return {
        url: signedData?.signedUrl || data.path,
        provider: 'supabase',
        path: data.path,
      };
    } catch (err: unknown) {
      console.warn('Upload Supabase gagal, memeriksa konfigurasi fallback Cloudinary...', err);
      const cloudinaryPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
      if (cloudinaryPreset) {
        try {
          return await uploadToCloudinary(compressedBlob, filename);
        } catch (cloudinaryErr) {
          console.error('Fallback Cloudinary juga gagal:', cloudinaryErr);
        }
      }
      const errMessage = getErrorMessage(err, 'Terjadi kendala saat menyimpan foto medis');
      throw new Error(`Gagal mengunggah foto ke Supabase Storage: ${errMessage}`);
    }
  }

  // Jika eksplisit memilih Cloudinary
  return uploadToCloudinary(compressedBlob, filename);
}

/**
 * Helper upload ke Cloudinary via unsigned/signed upload
 */
async function uploadToCloudinary(blob: Blob, filename: string): Promise<UploadPhotoResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Konfigurasi Cloudinary belum lengkap (NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET belum diset)');
  }

  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('upload_preset', uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal mengunggah foto ke Cloudinary');
  }

  const data = await res.json();
  return {
    url: data.secure_url,
    provider: 'cloudinary',
    path: data.public_id,
  };
}

/**
 * Ambil signed URL untuk foto medis privat (Supabase Storage atau Cloudinary)
 */
export async function getSignedMedicalPhotoUrl(
  path: string,
  provider: StorageProvider = 'supabase'
): Promise<string> {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  if (provider === 'supabase') {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from('medical-photos')
      .createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      throw error || new Error('Gagal membuat signed URL foto medis');
    }
    return data.signedUrl;
  }

  // Cloudinary URL
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('Konfigurasi Cloudinary belum lengkap (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME belum diset)');
  }

  return `https://res.cloudinary.com/${cloudName}/image/upload/${path}`;
}

