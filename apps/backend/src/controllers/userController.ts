import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { sendSuccess, sendList } from '../utils/response';

export async function getStaff(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const staff = await userService.getAllStaff();
    sendList(res, staff);
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.getUserById(req.params.id);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

export async function getCommunityMembers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const members = await userService.getAllCommunityMembers();
    sendList(res, members);
  } catch (error) {
    next(error);
  }
}
