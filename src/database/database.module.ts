// database/database.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGO_URI');
        if (!uri) {
          throw new Error('MONGO_URI is not defined!');
        }

        return {
          uri,
          onConnectionCreate: async (connection) => {
            connection.on('connected', () => {
              console.log('✅ MongoDB connected successfully');
            });

            connection.on('error', (error) => {
              console.log('❌ MongoDB connection error:', error);
            });

            connection.on('disconnected', () => {
              console.log('⚠️ MongoDB disconnected');
            });
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
