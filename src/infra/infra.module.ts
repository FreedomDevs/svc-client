import { Module } from '@nestjs/common';
import { PrismaModule } from '@prisma/prisma.module';
import { BootstrapModule } from '@/infra/bootstrap/bootstrap.module';

@Module({
  imports: [PrismaModule, BootstrapModule],
})
export class InfraModule {}
