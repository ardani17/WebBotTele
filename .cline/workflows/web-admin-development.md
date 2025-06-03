# Web Admin Development Workflow

## Overview
This workflow guides the development of the web admin interface for managing bot configuration, user access, and monitoring bot activities.

## Prerequisites
- Understanding of React + Vite + TypeScript + Tailwind CSS
- Knowledge of NestJS backend architecture
- Understanding of Prisma ORM and PostgreSQL
- Familiarity with bot's mode isolation and access control system

## Step-by-Step Workflow

### 1. Project Setup Planning
```markdown
- [ ] Define web admin features and requirements
- [ ] Plan database schema for configuration management
- [ ] Design user interface mockups
- [ ] Plan API endpoints and data flow
- [ ] Define authentication and authorization strategy
- [ ] Plan real-time update mechanisms
```

### 2. Backend API Development (NestJS)

#### Create Controller
Create new file: `apps/backend/src/modules/{module}/{module}.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { {Module}Service } from './{module}.service';
import { Create{Entity}Dto, Update{Entity}Dto, {Entity}ResponseDto } from './dto';

@ApiTags('{module}')
@Controller('api/{module}')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class {Module}Controller {
  constructor(private readonly {module}Service: {Module}Service) {}

  @Get()
  @Roles('admin', 'viewer')
  @ApiOperation({ summary: 'Get all {entities}' })
  @ApiResponse({ status: 200, description: 'List of {entities}', type: [{Entity}ResponseDto] })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ): Promise<{Entity}ResponseDto[]> {
    try {
      return await this.{module}Service.findAll({ page, limit, search });
    } catch (error) {
      throw new HttpException(
        'Failed to fetch {entities}',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @Roles('admin', 'viewer')
  @ApiOperation({ summary: 'Get {entity} by ID' })
  @ApiResponse({ status: 200, description: '{Entity} found', type: {Entity}ResponseDto })
  @ApiResponse({ status: 404, description: '{Entity} not found' })
  async findOne(@Param('id') id: string): Promise<{Entity}ResponseDto> {
    const {entity} = await this.{module}Service.findOne(id);
    if (!{entity}) {
      throw new HttpException('{Entity} not found', HttpStatus.NOT_FOUND);
    }
    return {entity};
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create new {entity}' })
  @ApiResponse({ status: 201, description: '{Entity} created', type: {Entity}ResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() create{Entity}Dto: Create{Entity}Dto): Promise<{Entity}ResponseDto> {
    try {
      return await this.{module}Service.create(create{Entity}Dto);
    } catch (error) {
      throw new HttpException(
        'Failed to create {entity}',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update {entity}' })
  @ApiResponse({ status: 200, description: '{Entity} updated', type: {Entity}ResponseDto })
  @ApiResponse({ status: 404, description: '{Entity} not found' })
  async update(
    @Param('id') id: string,
    @Body() update{Entity}Dto: Update{Entity}Dto,
  ): Promise<{Entity}ResponseDto> {
    try {
      return await this.{module}Service.update(id, update{Entity}Dto);
    } catch (error) {
      throw new HttpException(
        'Failed to update {entity}',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete {entity}' })
  @ApiResponse({ status: 200, description: '{Entity} deleted' })
  @ApiResponse({ status: 404, description: '{Entity} not found' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    try {
      await this.{module}Service.remove(id);
      return { message: '{Entity} deleted successfully' };
    } catch (error) {
      throw new HttpException(
        'Failed to delete {entity}',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
```

#### Create Service
Create new file: `apps/backend/src/modules/{module}/{module}.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Create{Entity}Dto, Update{Entity}Dto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class {Module}Service {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const { page = 1, limit = 10, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.{Entity}WhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [{entities}, total] = await Promise.all([
      this.prisma.{entity}.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.{entity}.count({ where }),
    ]);

    return {
      data: {entities},
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const {entity} = await this.prisma.{entity}.findUnique({
      where: { id },
    });

    if (!{entity}) {
      throw new NotFoundException('{Entity} not found');
    }

    return {entity};
  }

  async create(data: Create{Entity}Dto) {
    return this.prisma.{entity}.create({
      data,
    });
  }

  async update(id: string, data: Update{Entity}Dto) {
    const {entity} = await this.findOne(id);
    
    return this.prisma.{entity}.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const {entity} = await this.findOne(id);
    
    return this.prisma.{entity}.delete({
      where: { id },
    });
  }
}
```

#### Create DTOs
Create new file: `apps/backend/src/modules/{module}/dto/index.ts`

```typescript
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class Create{Entity}Dto {
  @ApiProperty({ description: '{Entity} name' })
  @IsString()
  name: string;

  @ApiProperty({ description: '{Entity} description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Is {entity} active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class Update{Entity}Dto extends PartialType(Create{Entity}Dto) {}

export class {Entity}ResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
```

### 3. Frontend Component Development (React + Tailwind)

#### Create Page Component
Create new file: `apps/frontend/src/pages/{Entity}Management.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { {entity}Api } from '../services/api';
import { {Entity}Modal } from '../components/{entity}/{Entity}Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Pagination } from '../components/ui/Pagination';

interface {Entity} {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const {Entity}Management: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{Entity} | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<{Entity} | null>(null);

  const queryClient = useQueryClient();

  // Fetch {entities}
  const {
    data: {entities}Data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['{entities}', page, search],
    queryFn: () => {entity}Api.getAll({ page, limit: 10, search }),
    keepPreviousData: true,
  });

  // Create {entity} mutation
  const createMutation = useMutation({
    mutationFn: {entity}Api.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['{entities}']);
      setIsModalOpen(false);
      setSelectedEntity(null);
      toast.success('{Entity} created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create {entity}');
    },
  });

  // Update {entity} mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      {entity}Api.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['{entities}']);
      setIsModalOpen(false);
      setSelectedEntity(null);
      toast.success('{Entity} updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update {entity}');
    },
  });

  // Delete {entity} mutation
  const deleteMutation = useMutation({
    mutationFn: {entity}Api.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['{entities}']);
      setIsDeleteDialogOpen(false);
      setEntityToDelete(null);
      toast.success('{Entity} deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete {entity}');
    },
  });

  const handleCreate = () => {
    setSelectedEntity(null);
    setIsModalOpen(true);
  };

  const handleEdit = ({entity}: {Entity}) => {
    setSelectedEntity({entity});
    setIsModalOpen(true);
  };

  const handleDelete = ({entity}: {Entity}) => {
    setEntityToDelete({entity});
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = (data: any) => {
    if (selectedEntity) {
      updateMutation.mutate({ id: selectedEntity.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const confirmDelete = () => {
    if (entityToDelete) {
      deleteMutation.mutate(entityToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        Error loading {entities}. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{Entity} Management</h1>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add {Entity}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search {entities}..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {{entities}Data?.data.map(({entity}: {Entity}) => (
              <tr key={{entity}.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {{entity}.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{entity}.description || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${{entity}.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {{entity}.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date({entity}.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit({entity})}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete({entity})}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {entities}Data?.meta && (
        <Pagination
          currentPage={page}
          totalPages={{entities}Data.meta.totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Modal */}
      <{Entity}Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEntity(null);
        }}
        onSubmit={handleSubmit}
        {entity}={selectedEntity}
        isLoading={createMutation.isLoading || updateMutation.isLoading}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setEntityToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete {Entity}"
        message={`Are you sure you want to delete "${entityToDelete?.name}"? This action cannot be undone.`}
        isLoading={deleteMutation.isLoading}
      />
    </div>
  );
};
```

#### Create Modal Component
Create new file: `apps/frontend/src/components/{entity}/{Entity}Modal.tsx`

```typescript
import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Switch } from '../ui/Switch';

const schema = yup.object({
  name: yup.string().required('Name is required'),
  description: yup.string(),
  isActive: yup.boolean(),
});

interface {Entity}ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  {entity}?: any;
  isLoading?: boolean;
}

export const {Entity}Modal: React.FC<{Entity}ModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  {entity},
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: {entity}?.name || '',
      description: {entity}?.description || '',
      isActive: {entity}?.isActive ?? true,
    },
  });

  React.useEffect(() => {
    if ({entity}) {
      reset({
        name: {entity}.name,
        description: {entity}.description || '',
        isActive: {entity}.isActive,
      });
    } else {
      reset({
        name: '',
        description: '',
        isActive: true,
      });
    }
  }, [{entity}, reset]);

  const handleFormSubmit = (data: any) => {
    onSubmit(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {{entity} ? 'Edit' : 'Create'} {Entity}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <Input
            label="Name"
            {...register('name')}
            error={errors.name?.message}
            placeholder="Enter {entity} name"
          />

          <Textarea
            label="Description"
            {...register('description')}
            error={errors.description?.message}
            placeholder="Enter {entity} description"
            rows={3}
          />

          <Switch
            label="Active"
            checked={watch('isActive')}
            onChange={(checked) => setValue('isActive', checked)}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
            >
              {{entity} ? 'Update' : 'Create'} {Entity}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
```

### 4. API Service Layer
Create new file: `apps/frontend/src/services/api/{entity}.api.ts`

```typescript
import { apiClient } from '../client';

export interface {Entity} {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Create{Entity}Data {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface Update{Entity}Data extends Partial<Create{Entity}Data> {}

export interface {Entity}ListResponse {
  data: {Entity}[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const {entity}Api = {
  async getAll(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{Entity}ListResponse> {
    const response = await apiClient.get('/{entities}', { params });
    return response.data;
  },

  async getById(id: string): Promise<{Entity}> {
    const response = await apiClient.get(`/{entities}/${id}`);
    return response.data;
  },

  async create(data: Create{Entity}Data): Promise<{Entity}> {
    const response = await apiClient.post('/{entities}', data);
    return response.data;
  },

  async update(id: string, data: Update{Entity}Data): Promise<{Entity}> {
    const response = await apiClient.put(`/{entities}/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/{entities}/${id}`);
  },
};
```

### 5. Database Schema (Prisma)
Add to `packages/database/prisma/schema.prisma`:

```prisma
model {Entity} {
  id          String   @id @default(cuid())
  name        String
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("{entities}")
}
```

### 6. Real-time Updates (WebSocket)

#### Backend WebSocket Gateway
Create new file: `apps/backend/src/websocket/{entity}.gateway.ts`

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
@UseGuards(WsJwtGuard)
export class {Entity}Gateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join{Entity}Room')
  handleJoin{Entity}Room(client: Socket, data: { room: string }) {
    client.join(data.room);
    client.emit('{entity}RoomJoined', { room: data.room });
  }

  @SubscribeMessage('leave{Entity}Room')
  handleLeave{Entity}Room(client: Socket, data: { room: string }) {
    client.leave(data.room);
    client.emit('{entity}RoomLeft', { room: data.room });
  }

  // Emit events to all clients
  emit{Entity}Created({entity}: any) {
    this.server.emit('{entity}Created', {entity});
  }

  emit{Entity}Updated({entity}: any) {
    this.server.emit('{entity}Updated', {entity});
  }

  emit{Entity}Deleted(id: string) {
    this.server.emit('{entity}Deleted', { id });
  }
}
```

#### Frontend WebSocket Hook
Create new file: `apps/frontend/src/hooks/useWebSocket.ts`

```typescript
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

export const useWebSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    // Initialize socket connection
    socketRef.current = io(process.env.REACT_APP_WS_URL || 'http://localhost:3001', {
      auth: {
        token,
      },
    });

    const socket = socketRef.current;

    // Listen for {entity} events
    socket.on('{entity}Created', ({entity}) => {
      queryClient.invalidateQueries(['{entities}']);
    });

    socket.on('{entity}Updated', ({entity}) => {
      queryClient.invalidateQueries(['{entities}']);
      queryClient.setQueryData(['{entities}', {entity}.id], {entity});
    });

    socket.on('{entity}Deleted', ({ id }) => {
      queryClient.invalidateQueries(['{entities}']);
      queryClient.removeQueries(['{entities}', id]);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, queryClient]);

  return socketRef.current;
};
```

### 7. Testing Checklist
```markdown
- [ ] Test API endpoints with proper authentication
- [ ] Test CRUD operations for all entities
- [ ] Test pagination and search functionality
- [ ] Test form validation and error handling
- [ ] Test real-time updates via WebSocket
- [ ] Test responsive design on different screen sizes
- [ ] Test loading states and error boundaries
- [ ] Test role-based access control
- [ ] Test data persistence and consistency
- [ ] Test performance with large datasets
```

### 8. Deployment Checklist
```markdown
- [ ] Configure environment variables for production
- [ ] Set up database migrations
- [ ] Configure CORS and security headers
- [ ] Set up SSL certificates
- [ ] Configure reverse proxy (nginx)
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies
- [ ] Test deployment in staging environment
- [ ] Set up CI/CD pipeline
- [ ] Configure health checks
```

## Best Practices

### 1. Component Design
- Use composition over inheritance
- Keep components small and focused
- Use TypeScript for type safety
- Implement proper error boundaries
- Use consistent naming conventions

### 2. State Management
- Use React Query for server state
- Use React Hook Form for form state
- Minimize global state usage
- Implement optimistic updates where appropriate

### 3. API Design
- Use RESTful conventions
- Implement proper error handling
- Use consistent response formats
- Implement rate limiting
- Use proper HTTP status codes

### 4. Security
- Implement proper authentication and authorization
- Validate all inputs on both client and server
- Use HTTPS in production
- Implement CSRF protection
- Sanitize user inputs

### 5. Performance
- Implement code splitting and lazy loading
- Use proper caching strategies
- Optimize database queries
- Implement pagination for large datasets
- Use proper indexing in database

## Troubleshooting

### Common Issues
1. **CORS errors**: Check CORS configuration in backend
2. **Authentication failures**: Verify JWT token handling
3. **WebSocket connection issues**: Check WebSocket configuration and authentication
4. **Database connection errors**: Verify database configuration and connectivity
5. **Build failures**: Check TypeScript types and dependencies

### Debugging Tips
1. Use browser developer tools for frontend debugging
2. Check server logs for backend issues
3. Use database query logs for performance issues
4. Monitor network requests for API issues
5. Use React Developer Tools for component debugging
