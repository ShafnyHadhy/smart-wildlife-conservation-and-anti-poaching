import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { sendSuccess, sendList } from '../utils/response';

export async function getStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const role = req.query.role as any;
    const parkId = req.query.parkId as string | undefined;
    const staff = await userService.getAllStaff({ role, parkId });
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

export async function getCommunityMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filter = {
      phone: req.query.phone as string | undefined,
      village: req.query.village as string | undefined,
      search: req.query.search as string | undefined,
    };
    const members = await userService.getCommunityMembers(filter);
    sendList(res, members);
  } catch (error) {
    next(error);
  }
}

export async function createCommunityMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = await userService.registerCommunityMember(req.body);
    sendSuccess(res, member, 201);
  } catch (error) {
    next(error);
  }
}
