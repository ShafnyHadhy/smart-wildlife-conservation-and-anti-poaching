import { userRepository } from '../repositories/userRepository';
import { User, CommunityMember } from '@wildlife/shared';
import { NotFoundError } from '../errors/AppError';

export class UserService {
  async getAllStaff(): Promise<User[]> {
    return userRepository.findAllStaff();
  }

  async getUserById(id: string): Promise<User> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }
    return user;
  }

  async getAllCommunityMembers(): Promise<CommunityMember[]> {
    return userRepository.findAllCommunityMembers();
  }

  async getCommunityMemberById(id: string): Promise<CommunityMember> {
    const member = await userRepository.findCommunityMemberById(id);
    if (!member) {
      throw new NotFoundError('Community Member', id);
    }
    return member;
  }
}

export const userService = new UserService();
