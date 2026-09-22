import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface WeatherForecast {
  temperatureC: number;
  windSpeedKmh: number;
  time: string;
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    wind_speed_10m: number;
    time: string;
  };
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getCurrentWeather(): Promise<WeatherForecast | null> {
    const baseUrl = this.configService.get<string>('externalApi.weatherUrl');
    const timeoutMs = this.configService.get<number>(
      'externalApi.timeoutMs',
    )!;
    const latitude = this.configService.get<number>(
      'externalApi.weatherLatitude',
    );
    const longitude = this.configService.get<number>(
      'externalApi.weatherLongitude',
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get<OpenMeteoResponse>(baseUrl!, {
          timeout: timeoutMs,
          params: {
            latitude,
            longitude,
            current: 'temperature_2m,wind_speed_10m',
          },
        }),
      );

      return {
        temperatureC: response.data.current.temperature_2m,
        windSpeedKmh: response.data.current.wind_speed_10m,
        time: response.data.current.time,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.warn(
        `Falha ao consultar previsão do tempo: ${axiosError.message}`,
      );
      return null;
    }
  }
}
