import { query } from '../config/database';
import { User, UserRole, CommunityMember, CreateCommunityMemberDTO } from '@wildlife/shared';

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
  async findAllStaff(filter?: { role?: UserRole; parkId?: string }): Promise<User[]> {
    let sql = 'SELECT * FROM users';
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter?.role) {
      params.push(filter.role);
      conditions.push(`role = $${params.length}`);
    }
    if (filter?.parkId) {
      params.push(filter.parkId);
      conditions.push(`park_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY full_name ASC';
    const res = await query(sql, params);
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
    return this.findCommunityMembers();
  }

  async findCommunityMembers(filter?: { phone?: string; village?: string; search?: string }): Promise<CommunityMember[]> {
    let sql = 'SELECT * FROM community_members';
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter?.phone) {
      params.push(`%${filter.phone}%`);
      conditions.push(`phone_number ILIKE $${params.length}`);
    }
    if (filter?.village) {
      params.push(`%${filter.village}%`);
      conditions.push(`village_name ILIKE $${params.length}`);
    }
    if (filter?.search) {
      params.push(`%${filter.search}%`);
      const pIdx = params.length;
      conditions.push(`(full_name ILIKE $${pIdx} OR phone_number ILIKE $${pIdx} OR village_name ILIKE $${pIdx})`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY full_name ASC';

    const res = await query(sql, params);
    return res.rows.map(mapRowToCommunityMember);
  }

  async findCommunityMemberById(id: string): Promise<CommunityMember | null> {
    const res = await query('SELECT * FROM community_members WHERE id = $1', [id]);
    return res.rows[0] ? mapRowToCommunityMember(res.rows[0]) : null;
  }

  async createCommunityMember(data: CreateCommunityMemberDTO): Promise<CommunityMember> {
    const sql = `
      INSERT INTO community_members (full_name, national_id, phone_number, village_name, address, park_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const res = await query(sql, [
      data.fullName,
      data.nationalId || null,
      data.phoneNumber,
      data.villageName,
      data.address || null,
      data.parkId || null,
    ]);
    return mapRowToCommunityMember(res.rows[0]);
  }
}

export const userRepository = new UserRepository();
