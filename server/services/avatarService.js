import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AvatarService {
  constructor() {
    this.uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    this.dimensions = { width: 200, height: 200 };
  }

  // Validate uploaded file
  validateFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new Error('File size must be less than 5MB');
    }

    if (!this.allowedTypes.includes(file.mimetype)) {
      throw new Error('Only JPEG, PNG, and WebP images are allowed');
    }
  }

  // Generate unique filename
  generateFilename(originalName) {
    const ext = path.extname(originalName);
    const uuid = crypto.randomUUID();
    return `${uuid}${ext}`;
  }

  // Process and save avatar
  async saveAvatar(file, userId) {
    this.validateFile(file);

    try {
      // Generate unique filename
      const filename = this.generateFilename(file.originalname);
      const filepath = path.join(this.uploadDir, filename);

      // Process image with sharp: resize and compress
      const buffer = await this.processImage(file);

      // Save processed image
      fs.writeFileSync(filepath, buffer);

      // Return relative URL for database storage
      return `/uploads/avatars/${filename}`;
    } catch (error) {
      console.error('Error saving avatar:', error);
      throw new Error('Failed to save avatar');
    }
  }

  // Process image: resize and compress
  async processImage(file) {
    try {
      // Convert file to buffer if it's not already
      let buffer;
      if (file.buffer) {
        buffer = file.buffer;
      } else if (file.path) {
        buffer = fs.readFileSync(file.path);
      } else {
        throw new Error('Invalid file format');
      }

      // Process with sharp
      return await sharp(buffer)
        .resize(this.dimensions.width, this.dimensions.height, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error('Failed to process image');
    }
  }

  // Delete old avatar
  deleteAvatar(avatarUrl) {
    if (!avatarUrl || avatarUrl.startsWith('http')) {
      return; // Don't delete external URLs or null values
    }

    try {
      const filepath = path.join(__dirname, '..', avatarUrl);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log('Deleted old avatar:', filepath);
      }
    } catch (error) {
      console.error('Error deleting avatar:', error);
      // Don't throw error, just log it
    }
  }

  // Get avatar info
  getAvatarInfo(avatarUrl) {
    if (!avatarUrl) {
      return null;
    }

    try {
      const filepath = path.join(__dirname, '..', avatarUrl);
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        return {
          url: avatarUrl,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      }
    } catch (error) {
      console.error('Error getting avatar info:', error);
    }

    return null;
  }
}

export default new AvatarService();
