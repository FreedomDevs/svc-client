import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';

@Controller('client')
export class ClientController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('')
  async getHealth() {

  }
}
