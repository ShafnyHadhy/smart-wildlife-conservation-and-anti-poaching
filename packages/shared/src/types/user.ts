import { UserRole } from '../enums';

/**
 * Conservation Organization Staff User
 */
export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
  badgeNumber?: string;
  parkId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDTO {
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
  badgeNumber?: string;
  parkId?: string;
}

/**
 * Community Member (Local external reporter, not system staff)
 */
export interface CommunityMember {
  id: string;
  fullName: string;
  nationalId?: string;
  phoneNumber: string;
  villageName: string;
  address?: string;
  parkId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommunityMemberDTO {
  fullName: string;
  nationalId?: string;
  phoneNumber: string;
  villageName: string;
  address?: string;
  parkId?: string;
}
