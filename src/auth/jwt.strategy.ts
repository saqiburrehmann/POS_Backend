import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'supersecret',
    });
  }

  async validate(payload: any) {
    console.log('✅ JWT payload received in validate():', payload);

    if (!payload.sub) {
      console.error('❌ JWT payload missing sub (user id)');
      throw new UnauthorizedException('Invalid token: sub missing');
    }

    const user = { id: payload.sub, email: payload.email, role: payload.role };
    console.log('✅ User object attached to request:', user);
    return user; // this will be req.user
  }
}

