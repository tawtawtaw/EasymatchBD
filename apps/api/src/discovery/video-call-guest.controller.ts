import { Controller, Get, Param, Post } from '@nestjs/common';
import { VideoCallGuestsService } from './video-call-guests.service';

@Controller('video-calls/guest')
export class VideoCallGuestController {
  constructor(private readonly guests: VideoCallGuestsService) {}

  @Get(':token')
  getLobby(@Param('token') token: string) {
    return this.guests.getGuestLobby(token);
  }

  @Post(':token/join')
  join(@Param('token') token: string) {
    return this.guests.getGuestLiveKitToken(token);
  }
}
