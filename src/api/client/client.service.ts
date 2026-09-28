import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { efail, ok } from '@common/response/response.helper';
import { ClientCodes } from '@/api/client/client.codes';
import { createHash, randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';

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

@Injectable()
export class ClientService {
  private readonly logger = new Logger(ClientService.name);

  private readonly storagePath = join(process.cwd(), 'storage');

  constructor(private readonly prisma: PrismaService) {}

  // Public

  async getLatest() {
    const client = await this.prisma.clientVersion.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        version: true,
        filename: true,
        size: true,
        sha256: true,
      },
    });

    if (!client) {
      return efail(
        'No client versions available',
        ClientCodes.NO_CLIENT_VERSIONS_AVAILABLE,
      );
    }

    return ok(
      client,
      'Latest client version retrieved successfully',
      ClientCodes.CLIENT_VERSION_RETRIEVED,
    );
  }

  async getVersion(version: string) {
    const client = await this.prisma.clientVersion.findUnique({
      where: { version },
      select: {
        id: true,
        version: true,
        filename: true,
        size: true,
        sha256: true,
      },
    });

    if (!client) {
      return efail(
        'Client version not found',
        ClientCodes.CLIENT_VERSION_NOT_FOUND,
      );
    }

    return ok(
      client,
      'Client version retrieved successfully',
      ClientCodes.CLIENT_VERSION_RETRIEVED,
    );
  }

  async getLibraries(version: string) {
    const client = await this.prisma.clientVersion.findUnique({
      where: { version },
      include: {
        libraries: {
          include: {
            library: {
              select: {
                id: true,
                name: true,
                version: true,
                filename: true,
                size: true,
                sha256: true,
              },
            },
          },
        },
      },
    });

    if (!client) {
      return efail(
        'Client version not found',
        ClientCodes.CLIENT_VERSION_NOT_FOUND,
      );
    }

    return ok(
      client.libraries.map(({ library }) => library),
      'Client libraries retrieved successfully',
      ClientCodes.CLIENT_LIBRARIES_RETRIEVED,
    );
  }

  async getInstance(slug: string) {
    const instance = await this.prisma.instance.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        plugins: {
          select: {
            id: true,
            name: true,
            version: true,
            filename: true,
            size: true,
            sha256: true,
          },
        },
      },
    });

    if (!instance) {
      return efail('Instance not found', ClientCodes.INSTANCE_NOT_FOUND);
    }

    return ok(
      instance,
      'Instance retrieved successfully',
      ClientCodes.INSTANCE_RETRIEVED,
    );
  }

  async getManifest(slug: string) {
    const [instance, client] = await Promise.all([
      this.prisma.instance.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          name: true,
          plugins: {
            select: {
              id: true,
              name: true,
              version: true,
              filename: true,
              size: true,
              sha256: true,
            },
          },
        },
      }),

      this.prisma.clientVersion.findFirst({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          version: true,
          filename: true,
          size: true,
          sha256: true,
          libraries: {
            select: {
              library: {
                select: {
                  id: true,
                  name: true,
                  version: true,
                  filename: true,
                  size: true,
                  sha256: true,
                },
              },
            },
          },
        },
      }),
    ]);

    if (!instance) {
      return efail('Instance not found', ClientCodes.INSTANCE_NOT_FOUND);
    }

    if (!client) {
      return efail(
        'No client versions available',
        ClientCodes.NO_CLIENT_VERSIONS_AVAILABLE,
      );
    }

    return ok(
      {
        instance,
        client: {
          id: client.id,
          version: client.version,
          filename: client.filename,
          size: client.size,
          sha256: client.sha256,
        },
        libraries: client.libraries.map(({ library }) => library),
        plugins: instance.plugins,
      },
      'Instance manifest retrieved successfully',
      ClientCodes.MANIFEST_RETRIEVED,
    );
  }

  async getClientFile(id: string) {
    const client = await this.prisma.clientVersion.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException('Client version not found');
    }

    return client;
  }

  async getLibraryFile(id: string) {
    const library = await this.prisma.library.findUnique({
      where: { id },
    });

    if (!library) {
      throw new NotFoundException('Library not found');
    }

    return library;
  }

  async getPluginFile(id: string) {
    const plugin = await this.prisma.plugin.findUnique({
      where: { id },
    });

    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }

    return plugin;
  }

  // Admin - Client

  async createClientVersion(version: string, file: UploadedFile) {
    this.validateFile(file);

    const { path, size, sha256 } = await this.saveFile('clients', file);

    try {
      const client = await this.prisma.clientVersion.create({
        data: {
          version,
          filename: file.originalname,
          path,
          size,
          sha256,
        },
      });

      return ok(
        client,
        'Client version created successfully',
        ClientCodes.CLIENT_VERSION_CREATED,
      );
    } catch (error) {
      await unlink(path).catch(() => {});
      throw error;
    }
  }

  async updateClientVersion(id: string, version: string, file?: UploadedFile) {
    const existing = await this.prisma.clientVersion.findUnique({
      where: { id },
    });

    if (!existing) {
      return efail(
        'Client version not found',
        ClientCodes.CLIENT_VERSION_NOT_FOUND,
      );
    }

    let fileData = {};

    if (file) {
      this.validateFile(file);

      const saved = await this.saveFile('clients', file);

      fileData = {
        filename: file.originalname,
        path: saved.path,
        size: saved.size,
        sha256: saved.sha256,
      };
    }

    const client = await this.prisma.clientVersion.update({
      where: { id },
      data: {
        version,
        ...fileData,
      },
    });

    if (file) {
      await unlink(existing.path).catch(() => {});
    }

    return ok(
      client,
      'Client version updated successfully',
      ClientCodes.CLIENT_VERSION_UPDATED,
    );
  }

  // Admin - Libraries

  async createLibrary(name: string, version: string, file: UploadedFile) {
    this.validateFile(file);

    const saved = await this.saveFile('libraries', file);

    try {
      const library = await this.prisma.library.create({
        data: {
          name,
          version,
          filename: file.originalname,
          path: saved.path,
          size: saved.size,
          sha256: saved.sha256,
        },
      });

      return ok(
        library,
        'Library created successfully',
        ClientCodes.LIBRARY_CREATED,
      );
    } catch (error) {
      await unlink(saved.path).catch(() => {});
      throw error;
    }
  }

  async updateLibrary(
    id: string,
    name: string,
    version: string,
    file?: UploadedFile,
  ) {
    const existing = await this.prisma.library.findUnique({
      where: { id },
    });

    if (!existing) {
      return efail('Library not found', ClientCodes.LIBRARY_NOT_FOUND);
    }

    let fileData = {};

    if (file) {
      this.validateFile(file);

      const saved = await this.saveFile('libraries', file);

      fileData = {
        filename: file.originalname,
        path: saved.path,
        size: saved.size,
        sha256: saved.sha256,
      };
    }

    const library = await this.prisma.library.update({
      where: { id },
      data: {
        name,
        version,
        ...fileData,
      },
    });

    if (file) {
      await unlink(existing.path).catch(() => {});
    }

    return ok(
      library,
      'Library updated successfully',
      ClientCodes.LIBRARY_UPDATED,
    );
  }

  // Admin - Instances

  async createInstance(slug: string, name: string) {
    const instance = await this.prisma.instance.create({
      data: {
        slug,
        name,
      },
    });

    return ok(
      instance,
      'Instance created successfully',
      ClientCodes.INSTANCE_CREATED,
    );
  }

  async updateInstance(id: string, slug: string, name: string) {
    const existing = await this.prisma.instance.findUnique({
      where: { id },
    });

    if (!existing) {
      return efail('Instance not found', ClientCodes.INSTANCE_NOT_FOUND);
    }

    const instance = await this.prisma.instance.update({
      where: { id },
      data: {
        slug,
        name,
      },
    });

    return ok(
      instance,
      'Instance updated successfully',
      ClientCodes.INSTANCE_UPDATED,
    );
  }

  // Admin - Plugins

  async createPlugin(
    instanceId: string,
    name: string,
    version: string,
    file: UploadedFile,
  ) {
    this.validateFile(file);

    const instance = await this.prisma.instance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      return efail('Instance not found', ClientCodes.INSTANCE_NOT_FOUND);
    }

    const saved = await this.saveFile('plugins', file);

    try {
      const plugin = await this.prisma.plugin.create({
        data: {
          instanceId,
          name,
          version,
          filename: file.originalname,
          path: saved.path,
          size: saved.size,
          sha256: saved.sha256,
        },
      });

      return ok(
        plugin,
        'Plugin created successfully',
        ClientCodes.PLUGIN_CREATED,
      );
    } catch (error) {
      await unlink(saved.path).catch(() => {});
      throw error;
    }
  }

  async updatePlugin(
    id: string,
    name: string,
    version: string,
    file?: UploadedFile,
  ) {
    const existing = await this.prisma.plugin.findUnique({
      where: { id },
    });

    if (!existing) {
      return efail('Plugin not found', ClientCodes.PLUGIN_NOT_FOUND);
    }

    let fileData = {};

    if (file) {
      this.validateFile(file);

      const saved = await this.saveFile('plugins', file);

      fileData = {
        filename: file.originalname,
        path: saved.path,
        size: saved.size,
        sha256: saved.sha256,
      };
    }

    const plugin = await this.prisma.plugin.update({
      where: { id },
      data: {
        name,
        version,
        ...fileData,
      },
    });

    if (file) {
      await unlink(existing.path).catch(() => {});
    }

    return ok(
      plugin,
      'Plugin updated successfully',
      ClientCodes.PLUGIN_UPDATED,
    );
  }

  // Admin - Relations

  async addLibraryToClient(clientVersionId: string, libraryId: string) {
    const relation = await this.prisma.clientLibrary.create({
      data: {
        clientVersionId,
        libraryId,
      },
    });

    return ok(
      relation,
      'Library added to client successfully',
      ClientCodes.LIBRARY_ADDED_TO_CLIENT,
    );
  }

  async removeLibraryFromClient(clientVersionId: string, libraryId: string) {
    await this.prisma.clientLibrary.delete({
      where: {
        clientVersionId_libraryId: {
          clientVersionId,
          libraryId,
        },
      },
    });

    return ok(
      null,
      'Library removed from client successfully',
      ClientCodes.LIBRARY_REMOVED_FROM_CLIENT,
    );
  }

  // Storage

  private validateFile(file: UploadedFile) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
  }

  private async saveFile(
    type: 'clients' | 'libraries' | 'plugins',
    file: UploadedFile,
  ) {
    const directory = join(this.storagePath, type);

    await mkdir(directory, {
      recursive: true,
    });

    const sha256 = createHash('sha256').update(file.buffer).digest('hex');

    const filename = `${randomUUID()}-${file.originalname}`;
    const path = join(directory, filename);

    await writeFile(path, file.buffer);

    return {
      path,
      size: file.size,
      sha256,
    };
  }
}
