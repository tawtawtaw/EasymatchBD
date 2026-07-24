import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      name: 'EasymatchBD API',
      version: '0.1.0',
      description:
        'Bangladesh matrimonial platform API with progressive privacy matchmaking',
    };
  }
}
