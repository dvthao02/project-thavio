import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SubscriptionService } from './subscription.service';

@Controller('business/subscription')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('status')
  getStatus(@Headers('authorization') authHeader: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    let payload: any;
    try {
      payload = this.jwtService.verify(authHeader.slice(7));
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    if (payload.scope !== 'business') {
      throw new UnauthorizedException('Invalid token scope');
    }
    return this.subscriptionService.getStatus(payload.businessCode);
  }
}
