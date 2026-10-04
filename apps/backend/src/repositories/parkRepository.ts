import { query } from '../config/database';
import { Park } from '@wildlife/shared';

function mapRowToPark(row: any): Park {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    areaSqKm: row.area_sq_km ? parseFloat(row.area_sq_km) : undefined,
    description: row.description,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class ParkRepository {
  async findAll(): Promise<Park[]> {
    const res = await query('SELECT * FROM parks ORDER BY name ASC');
    return res.rows.map(mapRowToPark);
  }

  async findById(id: string): Promise<Park | null> {
    const res = await query('SELECT * FROM parks WHERE id = $1', [id]);
    return res.rows[0] ? mapRowToPark(res.rows[0]) : null;
  }

  async findByCode(code: string): Promise<Park | null> {
    const res = await query('SELECT * FROM parks WHERE code = $1', [code]);
    return res.rows[0] ? mapRowToPark(res.rows[0]) : null;
  }
}

export const parkRepository = new ParkRepository();
