import multer, { MulterError } from "multer";
import type { RequestHandler, Request, Response, NextFunction } from "express";
import { AppError } from "@/shared/utils/app-error";

export interface FileUploadOptions {
  /** Multer field name (default: "file") */
  fieldName?: string;
  /** Allowed MIME types */
  allowedMimeTypes: string[];
  /** Max file size in MB (default: 50) */
  maxSizeMb?: number;
  /** Whether the file is required (default: true) */
  required?: boolean;
}

/**
 * Returns [multerMiddleware, validationMiddleware].
 * Spreads directly into a route definition:
 *   router.post("/", ...createFileUploadMiddleware({ allowedMimeTypes: [...] }))
 */
export function createFileUploadMiddleware(
  options: FileUploadOptions
): RequestHandler[] {
  const {
    fieldName = "file",
    allowedMimeTypes,
    maxSizeMb = 50,
    required = true,
  } = options;

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new AppError(
            400,
            `Unsupported file type "${file.mimetype}". Allowed: ${allowedMimeTypes.join(", ")}`
          )
        );
      }
    },
  });

  const multerMiddleware: RequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    upload.single(fieldName)(req, res, (err) => {
      if (!err) return next();

      if (err instanceof MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(
            new AppError(400, `File exceeds the ${maxSizeMb} MB size limit`)
          );
        }
        return next(new AppError(400, `Upload error: ${err.message}`));
      }

      next(err);
    });
  };

  const validationMiddleware: RequestHandler = (
    req: Request,
    _res: Response,
    next: NextFunction
  ) => {
    if (required && !req.file) {
      return next(new AppError(400, "A file is required"));
    }
    next();
  };

  return [multerMiddleware, validationMiddleware];
}
