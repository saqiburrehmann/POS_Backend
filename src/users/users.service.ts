import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    try {
      if (dto.password !== dto.confirmPassword)
        throw new ConflictException('Passwords do not match');

      const exists = await this.userModel.findOne({ email: dto.email });
      if (exists) throw new ConflictException('Email already exists');

      const hashed = await bcrypt.hash(dto.password, 10);
      const { confirmPassword, ...data } = dto;

      const user = new this.userModel({ ...data, password: hashed });
      const saved = await user.save();

      // Use constructor directly to include _id properly
      return new UserResponseDto(saved);
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findAll(): Promise<UserResponseDto[]> {
    try {
      const users = await this.userModel.find().sort({ createdAt: -1 });
      return users.map((u) => new UserResponseDto(u));
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

  async findOne(id: string): Promise<UserResponseDto> {
    try {
      const user = await this.userModel.findById(id);
      if (!user) throw new NotFoundException('User not found');
      return new UserResponseDto(user);
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Failed to fetch user');
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    try {
      return this.userModel.findOne({ email }).select('+password');
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    try {
      if (dto.password) dto.password = await bcrypt.hash(dto.password, 10);
      const updated = await this.userModel.findByIdAndUpdate(id, dto, {
        new: true,
      });
      if (!updated) throw new NotFoundException('User not found');
      return new UserResponseDto(updated);
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      const deleted = await this.userModel.findByIdAndDelete(id);
      if (!deleted) throw new NotFoundException('User not found');
      return { message: `User with ID ${id} deleted successfully` };
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Failed to delete user');
    }
  }
}
