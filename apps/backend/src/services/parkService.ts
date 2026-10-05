import { parkRepository } from '../repositories/parkRepository';
import { Park } from '@wildlife/shared';
import { NotFoundError } from '../errors/AppError';

export class ParkService {
  async getAllParks(): Promise<Park[]> {
    return parkRepository.findAll();
  }

  async getParkById(id: string): Promise<Park> {
    const park = await parkRepository.findById(id);
    if (!park) {
      throw new NotFoundError('Park', id);
    }
    return park;
  }
}

export const parkService = new ParkService();
