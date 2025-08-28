import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(
    dto: CreateUserDto,
  ): Promise<{ id: string; accessToken: string }> {
    try {
      // Only allow one admin
      const existingAdmin = await this.usersService.findByRole('admin');
      if (existingAdmin)
        throw new ConflictException('Admin account already exists');

      const user = await this.usersService.createAdmin(dto);

      const payload = { sub: user.id, email: user.email, role: user.role };
      const accessToken = this.jwtService.sign(payload);

      return { id: user.id, accessToken };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors)
          .map((e: any) => e.message)
          .join(', ');
        throw new BadRequestException(messages || 'Validation failed');
      }
      throw new InternalServerErrorException('Signup failed');
    }
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ id: string; accessToken: string }> {
    try {
      const user = await this.usersService.findByEmail(email);
      if (!user) throw new UnauthorizedException('Invalid credentials');

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid)
        throw new UnauthorizedException('Invalid credentials');

      const payload = { sub: user.id, email: user.email, role: user.role };
      const accessToken = this.jwtService.sign(payload);

      return { id: user.id, accessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException('Login failed');
    }
  }
}
