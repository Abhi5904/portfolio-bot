import "express";

declare global {
  namespace Express {
    interface Request {
      validated: {
        body: unknown;
        query: unknown;
        params: unknown;
      };
      sessionId?: string;
      adminEmail?: string;
    }
  }
}

export {};
