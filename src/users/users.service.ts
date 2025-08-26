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
import { Product, ProductDocument } from 'src/product/schemas/product.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    try {
      if (dto.password !== dto.confirmPassword) {
        throw new ConflictException('Passwords do not match');
      }

      // 🚨 Block signup if an admin already exists
      const adminExists = await this.userModel
        .findOne({ role: 'admin' })
        .lean();
      if (adminExists) {
        throw new ConflictException('An admin account already exists');
      }

      const exists = await this.userModel.findOne({ email: dto.email }).lean();
      if (exists) throw new ConflictException('Email already exists');

      const hashed = await bcrypt.hash(dto.password, 10);
      const { confirmPassword, ...data } = dto;

      const user = new this.userModel({
        ...data,
        password: hashed,
        role: 'admin', // always admin
      });

      const saved = await user.save();
      return new UserResponseDto(saved as UserDocument);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userModel.find().sort({ createdAt: -1 }).lean();
    return users.map((u) => new UserResponseDto(u as any));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userModel.findById(id).lean();
    if (!user) throw new NotFoundException('User not found');
    return new UserResponseDto(user as any);
  }

  async findByRole(role: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ role }).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const updateData: any = { ...dto };
    if (dto.password) {
      if (!dto.confirmPassword || dto.password !== dto.confirmPassword) {
        throw new BadRequestException(
          'Password and confirmPassword must match',
        );
      }
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    delete updateData.confirmPassword;

    const updated = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('User not found');
    return new UserResponseDto(updated as any);
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.userModel.findByIdAndDelete(id).exec();
    if (!user) throw new NotFoundException('User not found');

    // Delete all products owned by this user
    await this.productModel.deleteMany({ owner: user._id });

    return {
      message: `User with ID ${id} and their products deleted successfully`,
    };
  }
}
