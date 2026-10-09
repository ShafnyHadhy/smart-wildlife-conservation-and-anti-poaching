import { userRepository } from '../repositories/userRepository';
import { User, UserRole, CommunityMember, CreateCommunityMemberDTO } from '@wildlife/shared';
import { NotFoundError } from '../errors/AppError';

export class UserService {
  async getAllStaff(filter?: { role?: UserRole; parkId?: string }): Promise<User[]> {
    return userRepository.findAllStaff(filter);
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

  async getCommunityMembers(filter?: { phone?: string; village?: string; search?: string }): Promise<CommunityMember[]> {
    return userRepository.findCommunityMembers(filter);
  }

  async getCommunityMemberById(id: string): Promise<CommunityMember> {
    const member = await userRepository.findCommunityMemberById(id);
    if (!member) {
      throw new NotFoundError('Community Member', id);
    }
    return member;
  }

  async registerCommunityMember(data: CreateCommunityMemberDTO): Promise<CommunityMember> {
    return userRepository.createCommunityMember(data);
  }
}

export const userService = new UserService();
