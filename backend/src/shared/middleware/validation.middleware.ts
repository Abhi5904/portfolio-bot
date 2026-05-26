import type { Request, Response, NextFunction } from "express";
import type { ValidationSchemas } from "../types";

export const validate = <T extends ValidationSchemas>(schemas: T) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.validated = {
        body: undefined,
        query: undefined,
        params: undefined,
      };

      // Body
      if (schemas.body) {
        req.validated.body = await schemas.body.parseAsync(req.body);
      }

      // Query
      if (schemas.query) {
        req.validated.query = await schemas.query.parseAsync(req.query);
      }

      // Params
      if (schemas.params) {
        req.validated.params = await schemas.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
