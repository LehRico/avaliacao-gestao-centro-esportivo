import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface Holiday {
  date: string;
  name: string;
  type: string;
}

@Injectable()
export class HolidaysService {
  private readonly logger = new Logger(HolidaysService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getHolidaysByYear(year: number): Promise<Holiday[] | null> {
    const baseUrl = this.configService.get<string>('externalApi.holidaysUrl');
    const timeoutMs = this.configService.get<number>(
      'externalApi.timeoutMs',
    )!;

    try {
      const response = await firstValueFrom(
        this.httpService.get<Holiday[]>(`${baseUrl}/${year}`, {
          timeout: timeoutMs,
        }),
      );

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.warn(
        `Falha ao consultar feriados de ${year}: ${axiosError.message}`,
      );
      return null;
    }
  }

  async isHoliday(date: Date): Promise<Holiday | null> {
    const holidays = await this.getHolidaysByYear(date.getFullYear());

    if (!holidays) {
      return null;
    }

    const isoDate = date.toISOString().split('T')[0];

    return holidays.find((holiday) => holiday.date === isoDate) ?? null;
  }
}
