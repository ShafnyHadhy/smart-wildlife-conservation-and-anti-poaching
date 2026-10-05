import { query } from '../config/database';
import { User, UserRole, CommunityMember } from '@wildlife/shared';

function mapRowToUser(row: any): User {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phoneNumber: row.phone_number,
    role: row.role as UserRole,
    badgeNumber: row.badge_number,
    parkId: row.park_id,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapRowToCommunityMember(row: any): CommunityMember {
  return {
    id: row.id,
    fullName: row.full_name,
    nationalId: row.national_id,
    phoneNumber: row.phone_number,
    villageName: row.village_name,
    address: row.address,
    parkId: row.park_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class UserRepository {
  async findAllStaff(): Promise<User[]> {
    const res = await query('SELECT * FROM users ORDER BY full_name ASC');
    return res.rows.map(mapRowToUser);
  }

  async findById(id: string): Promise<User | null> {
    const res = await query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0] ? mapRowToUser(res.rows[0]) : null;
  }

  async findByRole(role: UserRole): Promise<User[]> {
    const res = await query('SELECT * FROM users WHERE role = $1 ORDER BY full_name ASC', [role]);
    return res.rows.map(mapRowToUser);
  }

  async findRangers(): Promise<User[]> {
    return this.findByRole(UserRole.RANGER);
  }

  async findAllCommunityMembers(): Promise<CommunityMember[]> {
    const res = await query('SELECT * FROM community_members ORDER BY full_name ASC');
    return res.rows.map(mapRowToCommunityMember);
  }

  async findCommunityMemberById(id: string): Promise<CommunityMember | null> {
    const res = await query('SELECT * FROM community_members WHERE id = $1', [id]);
    return res.rows[0] ? mapRowToCommunityMember(res.rows[0]) : null;
  }
}

export const userRepository = new UserRepository();
