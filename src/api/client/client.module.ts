import { Module } from '@nestjs/common';
import { ClientController } from '@/api/client/client.controller';
import { ClientService } from '@/api/client/client.service';

@Module({
  controllers: [ClientController],
  providers: [ClientService],
  exports: [ClientService],
})
export class ClientModule {}
