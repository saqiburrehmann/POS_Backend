import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import { UserResponseDto } from '../users/dto/user-response.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  // Signup returns user info + JWT
  async signup(
    dto: CreateUserDto,
  ): Promise<UserResponseDto & { accessToken: string }> {
    const user = await this.usersService.create(dto);

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return { ...user, accessToken };
  }

  // Login returns user info + JWT
  async login(
    email: string,
    password: string,
  ): Promise<UserResponseDto & { accessToken: string }> {
    const userDoc = await this.usersService.findByEmail(email);

    if (!userDoc) throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(password, userDoc.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    const user = new UserResponseDto(userDoc);

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return { ...user, accessToken };
  }
}
