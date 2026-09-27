import { Module } from '@nestjs/common';
import { ClientModule } from '@/api/client/client.module';

@Module({
  imports: [ClientModule],
})
export class ApiModule {}
