import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HolidaysService } from './holidays.service';
import { WeatherService } from './weather.service';

@Module({
  imports: [HttpModule],
  providers: [HolidaysService, WeatherService],
  exports: [HolidaysService, WeatherService],
})
export class ExternalModule {}
