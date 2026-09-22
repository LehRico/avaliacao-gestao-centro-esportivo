import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

const uploadDest = process.env.UPLOAD_DEST ?? './uploads';

export const regulationMulterOptions = {
  storage: diskStorage({
    destination: join(uploadDest, 'regulations'),
    filename: (_req, file, callback) => {
      const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  }),
  limits: {
    fileSize: Number(process.env.UPLOAD_MAX_FILE_SIZE_MB ?? 5) * 1024 * 1024,
  },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (file.mimetype !== 'application/pdf') {
      callback(
        new BadRequestException('Apenas arquivos PDF são permitidos.'),
        false,
      );
      return;
    }

    callback(null, true);
  },
};
