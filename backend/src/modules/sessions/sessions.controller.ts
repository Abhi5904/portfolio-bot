import { asyncHandler, successResponse } from "@/shared";
import type { Request, Response } from "express";
import type { SessionsService } from "./sessions.service";

export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  create = asyncHandler(async (_req: Request, res: Response) => {
    const result = await this.sessionsService.create();
    return successResponse(res, "Session created successfully", result, 201);
  });
}
