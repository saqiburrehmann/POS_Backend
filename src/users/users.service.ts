import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    try {
      if (dto.password !== dto.confirmPassword)
        throw new ConflictException('Passwords do not match');

      const exists = await this.userModel.findOne({ email: dto.email }).lean();
      if (exists) throw new ConflictException('Email already exists');

      const hashed = await bcrypt.hash(dto.password, 10);
      const { confirmPassword, ...data } = dto;

      const user = new this.userModel({ ...data, password: hashed });
      const saved = await user.save();

      return new UserResponseDto(saved as UserDocument);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      console.error(err);
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findAll(): Promise<UserResponseDto[]> {
    try {
      const users = await this.userModel.find().sort({ createdAt: -1 }).lean();
      return users.map((u) => new UserResponseDto(u as any));
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

  async findOne(id: string): Promise<UserResponseDto> {
    try {
      const user = await this.userModel.findById(id).lean();
      if (!user) throw new NotFoundException('User not found');
      return new UserResponseDto(user as any);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      console.error(err);
      throw new InternalServerErrorException('Failed to fetch user');
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    try {
      // Include password explicitly
      return this.userModel.findOne({ email }).select('+password').exec();
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    try {
      // If password is being updated, require confirmPassword and match
      const updateData: any = { ...dto };
      if (dto.password) {
        if (!dto.confirmPassword || dto.password !== dto.confirmPassword) {
          throw new BadRequestException(
            'Password and confirmPassword must match',
          );
        }
        updateData.password = await bcrypt.hash(dto.password, 10);
      }

      // Remove confirmPassword from update
      delete updateData.confirmPassword;

      const updated = await this.userModel
        .findByIdAndUpdate(id, updateData, {
          new: true,
        })
        .exec();

      if (!updated) throw new NotFoundException('User not found');
      return new UserResponseDto(updated as any);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      console.error(err);
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      const deleted = await this.userModel.findByIdAndDelete(id).exec();
      if (!deleted) throw new NotFoundException('User not found');
      return { message: `User with ID ${id} deleted successfully` };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      console.error(err);
      throw new InternalServerErrorException('Failed to delete user');
    }
  }
}
