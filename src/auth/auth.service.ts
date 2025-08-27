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
      const existingAdmin = await this.usersService.findByRole('admin');
      if (existingAdmin) {
        throw new ConflictException('An admin account already exists');
      }

      const user = await this.usersService.create({
        ...dto,
        role: 'admin',
      } as any);

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
      throw new InternalServerErrorException('Failed to sign up');
    }
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ id: string; accessToken: string }> {
    try {
      const userDoc = await this.usersService.findByEmail(email);
      if (!userDoc) throw new UnauthorizedException('Invalid credentials');

      const isValid = await bcrypt.compare(password, userDoc.password as string);
      if (!isValid) throw new UnauthorizedException('Invalid credentials');

      const payload = {
        sub: userDoc.id,
        email: userDoc.email,
        role: userDoc.role,
      };
      const accessToken = this.jwtService.sign(payload);

      return { id: userDoc.id, accessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException('Failed to log in');
    }
  }
}
