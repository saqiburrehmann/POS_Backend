import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import { UserResponseDto } from '../users/dto/user-response.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // Signup only allowed for one admin
  async signup(dto: CreateUserDto): Promise<UserResponseDto & { accessToken: string }> {
    // block if admin already exists
    const existingAdmin = await this.usersService.findByRole('admin');
    if (existingAdmin) {
      throw new ConflictException('An admin account already exists');
    }

    // force role = admin
    const user = await this.usersService.create({ ...dto, role: 'admin' } as any);

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { ...user, accessToken };
  }

  async login(email: string, password: string): Promise<UserResponseDto & { accessToken: string }> {
    const userDoc = await this.usersService.findByEmail(email);
    if (!userDoc) throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(password, userDoc.password as string);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    const user = new UserResponseDto(userDoc as any);

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { ...user, accessToken };
  }
}
