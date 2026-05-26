import type { Request, Response, NextFunction } from "express";

type AsyncFunction<TReq extends Request = Request> = (
  req: TReq,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export const asyncHandler = <TReq extends Request = Request>(
  fn: AsyncFunction<TReq>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as TReq, res, next)).catch(next);
  };
};
