import { Expose } from 'class-transformer';
import { UserDocument } from '../schemas/user.schema';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  email: string;

  @Expose()
  role: string;

  constructor(user: UserDocument) {
    this.id = user._id.toString();
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.email = user.email;
    this.role = (user as any).role || 'user';
  }
}
