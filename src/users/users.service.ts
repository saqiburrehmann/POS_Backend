import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { Product, ProductDocument } from 'src/product/schemas/product.schema';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async createAdmin(dto: CreateUserDto): Promise<UserDocument> {
    try {
      if (dto.password !== dto.confirmPassword)
        throw new BadRequestException('Passwords do not match');

      const adminExists = await this.userModel.findOne({ role: 'admin' });
      if (adminExists) throw new ConflictException('Admin already exists');

      const emailExists = await this.userModel.findOne({ email: dto.email });
      if (emailExists) throw new ConflictException('Email already exists');

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const user = new this.userModel({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        password: hashedPassword,
        role: 'admin',
      });

      return await user.save();
    } catch (err) {
      if (
        err instanceof ConflictException ||
        err instanceof BadRequestException
      )
        throw err;
      throw new InternalServerErrorException('Failed to create admin');
    }
  }

  async findByRole(role: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ role }).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      const user = await this.userModel.findByIdAndDelete(id).exec();
      if (!user) throw new NotFoundException('User not found');

      // Delete all products owned by this user
      await this.productModel.deleteMany({ owner: user._id }).exec();

      return {
        message: `User with ID ${id} and their products deleted successfully`,
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException('Failed to delete user');
    }
  }
}
