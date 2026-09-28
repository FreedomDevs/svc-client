import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { ClientService } from './client.service';

type UploadedFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
};

@ApiTags('Client')
@Controller()
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  // Public

  @Get('client/latest')
  @ApiOperation({ summary: 'Get latest client version' })
  @ApiResponse({ status: 200, description: 'Latest client version' })
  getLatest() {
    return this.clientService.getLatest();
  }

  @Get('client/versions/:version')
  @ApiOperation({ summary: 'Get client version' })
  @ApiParam({
    name: 'version',
    description: 'Client version',
    example: '1.0.0',
  })
  @ApiResponse({ status: 200, description: 'Client version' })
  getVersion(@Param('version') version: string) {
    return this.clientService.getVersion(version);
  }

  @Get('client/versions/:version/libraries')
  @ApiOperation({ summary: 'Get libraries for client version' })
  @ApiParam({
    name: 'version',
    description: 'Client version',
    example: '1.0.0',
  })
  @ApiResponse({ status: 200, description: 'Client libraries' })
  getLibraries(@Param('version') version: string) {
    return this.clientService.getLibraries(version);
  }

  @Get('client/download/:id')
  @ApiOperation({ summary: 'Download client file' })
  @ApiParam({
    name: 'id',
    description: 'Client version UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Client file',
    content: {
      'application/octet-stream': {},
    },
  })
  async downloadClient(@Param('id') id: string, @Res() response: Response) {
    const file = await this.clientService.getClientFile(id);

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    response.setHeader('Content-Length', file.size.toString());

    createReadStream(file.path).pipe(response);
  }

  @Get('libraries/download/:id')
  @ApiOperation({ summary: 'Download library file' })
  @ApiParam({
    name: 'id',
    description: 'Library UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Library file',
    content: {
      'application/octet-stream': {},
    },
  })
  async downloadLibrary(@Param('id') id: string, @Res() response: Response) {
    const file = await this.clientService.getLibraryFile(id);

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    response.setHeader('Content-Length', file.size.toString());

    createReadStream(file.path).pipe(response);
  }

  @Get('instances/:slug')
  @ApiOperation({ summary: 'Get instance information' })
  @ApiParam({
    name: 'slug',
    description: 'Instance slug',
    example: 'elysium-smp',
  })
  @ApiResponse({ status: 200, description: 'Instance information' })
  getInstance(@Param('slug') slug: string) {
    return this.clientService.getInstance(slug);
  }

  @Get('instances/:slug/manifest')
  @ApiOperation({ summary: 'Get instance manifest' })
  @ApiParam({
    name: 'slug',
    description: 'Instance slug',
    example: 'elysium-smp',
  })
  @ApiResponse({ status: 200, description: 'Instance manifest' })
  getManifest(@Param('slug') slug: string) {
    return this.clientService.getManifest(slug);
  }

  @Get('plugins/download/:id')
  @ApiOperation({ summary: 'Download plugin file' })
  @ApiParam({
    name: 'id',
    description: 'Plugin UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Plugin file',
    content: {
      'application/octet-stream': {},
    },
  })
  async downloadPlugin(@Param('id') id: string, @Res() response: Response) {
    const file = await this.clientService.getPluginFile(id);

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    response.setHeader('Content-Length', file.size.toString());

    createReadStream(file.path).pipe(response);
  }

  // Admin - Client

  @Post('admin/client/versions')
  @ApiOperation({ summary: 'Create client version' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['version', 'file'],
      properties: {
        version: {
          type: 'string',
          example: '1.0.0',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Client version created',
  })
  @UseInterceptors(FileInterceptor('file'))
  createClientVersion(
    @UploadedFile() file: UploadedFile,
    @Body('version') version: string,
  ) {
    return this.clientService.createClientVersion(version, file);
  }

  @Patch('admin/client/versions/:id')
  @ApiOperation({ summary: 'Update client version' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'id',
    description: 'Client version UUID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['version'],
      properties: {
        version: {
          type: 'string',
          example: '1.0.1',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Client version updated',
  })
  @UseInterceptors(FileInterceptor('file'))
  updateClientVersion(
    @Param('id') id: string,
    @UploadedFile() file: UploadedFile,
    @Body('version') version: string,
  ) {
    return this.clientService.updateClientVersion(id, version, file);
  }

  // Admin - Libraries

  @Post('admin/libraries')
  @ApiOperation({ summary: 'Create library' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'version', 'file'],
      properties: {
        name: {
          type: 'string',
          example: 'lwjgl',
        },
        version: {
          type: 'string',
          example: '3.3.4',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Library created',
  })
  @UseInterceptors(FileInterceptor('file'))
  createLibrary(
    @UploadedFile() file: UploadedFile,
    @Body('name') name: string,
    @Body('version') version: string,
  ) {
    return this.clientService.createLibrary(name, version, file);
  }

  @Patch('admin/libraries/:id')
  @ApiOperation({ summary: 'Update library' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'id',
    description: 'Library UUID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'version'],
      properties: {
        name: {
          type: 'string',
          example: 'lwjgl',
        },
        version: {
          type: 'string',
          example: '3.3.5',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Library updated',
  })
  @UseInterceptors(FileInterceptor('file'))
  updateLibrary(
    @Param('id') id: string,
    @UploadedFile() file: UploadedFile,
    @Body('name') name: string,
    @Body('version') version: string,
  ) {
    return this.clientService.updateLibrary(id, name, version, file);
  }

  // Admin - Instances

  @Post('admin/instances')
  @ApiOperation({ summary: 'Create instance' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['slug', 'name'],
      properties: {
        slug: {
          type: 'string',
          example: 'elysium-smp',
        },
        name: {
          type: 'string',
          example: 'Elysium SMP',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Instance created',
  })
  createInstance(@Body('slug') slug: string, @Body('name') name: string) {
    return this.clientService.createInstance(slug, name);
  }

  @Patch('admin/instances/:id')
  @ApiOperation({ summary: 'Update instance' })
  @ApiParam({
    name: 'id',
    description: 'Instance UUID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['slug', 'name'],
      properties: {
        slug: {
          type: 'string',
          example: 'elysium-smp',
        },
        name: {
          type: 'string',
          example: 'Elysium SMP',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Instance updated',
  })
  updateInstance(
    @Param('id') id: string,
    @Body('slug') slug: string,
    @Body('name') name: string,
  ) {
    return this.clientService.updateInstance(id, slug, name);
  }

  // Admin - Plugins

  @Post('admin/instances/:id/plugins')
  @ApiOperation({ summary: 'Create plugin for instance' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'id',
    description: 'Instance UUID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'version', 'file'],
      properties: {
        name: {
          type: 'string',
          example: 'ElysiumCore',
        },
        version: {
          type: 'string',
          example: '1.0.0',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Plugin created',
  })
  @UseInterceptors(FileInterceptor('file'))
  createPlugin(
    @Param('id') instanceId: string,
    @UploadedFile() file: UploadedFile,
    @Body('name') name: string,
    @Body('version') version: string,
  ) {
    return this.clientService.createPlugin(instanceId, name, version, file);
  }

  @Patch('admin/plugins/:id')
  @ApiOperation({ summary: 'Update plugin' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'id',
    description: 'Plugin UUID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'version'],
      properties: {
        name: {
          type: 'string',
          example: 'ElysiumCore',
        },
        version: {
          type: 'string',
          example: '1.0.1',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Plugin updated',
  })
  @UseInterceptors(FileInterceptor('file'))
  updatePlugin(
    @Param('id') id: string,
    @UploadedFile() file: UploadedFile,
    @Body('name') name: string,
    @Body('version') version: string,
  ) {
    return this.clientService.updatePlugin(id, name, version, file);
  }

  // Admin - Client libraries

  @Post('admin/client/versions/:id/libraries/:libraryId')
  @ApiOperation({ summary: 'Add library to client version' })
  @ApiParam({
    name: 'id',
    description: 'Client version UUID',
  })
  @ApiParam({
    name: 'libraryId',
    description: 'Library UUID',
  })
  @ApiResponse({
    status: 201,
    description: 'Library added to client',
  })
  addLibraryToClient(
    @Param('id') clientVersionId: string,
    @Param('libraryId') libraryId: string,
  ) {
    return this.clientService.addLibraryToClient(clientVersionId, libraryId);
  }

  @Delete('admin/client/versions/:id/libraries/:libraryId')
  @ApiOperation({ summary: 'Remove library from client version' })
  @ApiParam({
    name: 'id',
    description: 'Client version UUID',
  })
  @ApiParam({
    name: 'libraryId',
    description: 'Library UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Library removed from client',
  })
  removeLibraryFromClient(
    @Param('id') clientVersionId: string,
    @Param('libraryId') libraryId: string,
  ) {
    return this.clientService.removeLibraryFromClient(
      clientVersionId,
      libraryId,
    );
  }
}
