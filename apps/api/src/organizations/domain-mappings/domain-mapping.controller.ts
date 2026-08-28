import {
  Controller,
  Post,
  Patch,
  Get,
  Delete,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Param,
  Query,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { EmailVerifiedGuard } from '../../auth/email-verified.guard';
import { DomainMappingService } from './domain-mapping.service';
import { CreateDomainMappingDto } from './dto/create-domain-mapping.dto';
import { UpdateDomainMappingDto } from './dto/update-domain-mapping.dto';
import { OrganizationsService } from '../organizations.service';
import { TokenPayload, OrgRole } from '@app-starter/shared';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('domain-mappings')
@Controller()
export class DomainMappingController {
  constructor(
    private readonly domainMappingService: DomainMappingService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Post('organizations/:organizationId/domain-mappings')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new domain mapping for a organization' })
  @ApiResponse({ status: 201, description: 'Domain mapping created successfully' })
  async createDomainMapping(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Body() createDomainMappingDto: CreateDomainMappingDto,
  ) {
    const userId = req.user.sub;
    await this.ensureOrganizationAdmin(userId, organizationId);

    return this.domainMappingService.createDomainMapping(
      organizationId,
      createDomainMappingDto.domain,
    );
  }

  @Get('organizations/:organizationId/domain-mappings')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all domain mappings for a organization' })
  @ApiResponse({ status: 200, description: 'List of domain mappings' })
  async listDomainMappings(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
  ) {
    const userId = req.user.sub;
    const role = await this.organizationsService.getUserRoleInOrganization(userId, organizationId);
    if (!role) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const domainMappings = await this.domainMappingService.listDomainMappings(organizationId);
    return {
      domainMappings,
      total: domainMappings.length,
    };
  }

  @Get('organizations/:organizationId/domain-mappings/:mappingId')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a specific domain mapping' })
  @ApiResponse({ status: 200, description: 'Domain mapping details' })
  async getDomainMapping(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('mappingId') mappingId: string,
  ) {
    const userId = req.user.sub;
    const role = await this.organizationsService.getUserRoleInOrganization(userId, organizationId);
    if (!role) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const mapping = await this.domainMappingService.getDomainMapping(organizationId, mappingId);

    if (!mapping) {
      throw new NotFoundException('Domain mapping not found');
    }

    return mapping;
  }

  @Patch('organizations/:organizationId/domain-mappings/:mappingId')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update domain mapping settings' })
  @ApiResponse({ status: 200, description: 'Domain mapping updated successfully' })
  async updateDomainMapping(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('mappingId') mappingId: string,
    @Body() updateDomainMappingDto: UpdateDomainMappingDto,
  ) {
    const userId = req.user.sub;
    await this.ensureOrganizationAdmin(userId, organizationId);

    return this.domainMappingService.updateDomainMapping(
      organizationId,
      mappingId,
      updateDomainMappingDto,
    );
  }

  @Post('organizations/:organizationId/domain-mappings/:mappingId/verify')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a domain mapping' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async verifyDomain(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('mappingId') mappingId: string,
  ) {
    const userId = req.user.sub;
    await this.ensureOrganizationAdmin(userId, organizationId);

    return this.domainMappingService.verifyDomain(organizationId, mappingId);
  }

  @Delete('organizations/:organizationId/domain-mappings/:mappingId')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a domain mapping' })
  @ApiResponse({ status: 200, description: 'Domain mapping deleted' })
  async deleteDomainMapping(
    @Request() req: { user: TokenPayload },
    @Param('organizationId') organizationId: string,
    @Param('mappingId') mappingId: string,
  ) {
    const userId = req.user.sub;
    await this.ensureOrganizationAdmin(userId, organizationId);

    await this.domainMappingService.deleteDomainMapping(organizationId, mappingId);
    return { success: true, message: 'Domain mapping deleted' };
  }

  // Public endpoint for domain resolution
  @Get('domain-mappings/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveDomain(@Query('domain') domain: string) {
    if (!domain) {
      throw new NotFoundException('Domain parameter is required');
    }

    const resolution = await this.domainMappingService.resolveDomain(domain);
    if (!resolution) {
      throw new NotFoundException(`Domain ${domain} not found or not verified`);
    }

    return resolution;
  }

  @Get('domain-mappings/verify-entity')
  @HttpCode(HttpStatus.OK)
  async verifyEntity(
    @Query('domain') domain: string,
    @Query('entityType') entityType: string,
    @Query('entitySlug') entitySlug: string,
  ) {
    if (!domain || !entityType || !entitySlug) {
      throw new BadRequestException('domain, entityType, and entitySlug are required');
    }

    const isValid = await this.domainMappingService.verifyEntity(domain, entityType, entitySlug);
    return { valid: isValid };
  }

  private async ensureOrganizationAdmin(userId: string, organizationId: string) {
    const role = await this.organizationsService.getUserRoleInOrganization(userId, organizationId);
    if (role !== OrgRole.OWNER && role !== OrgRole.ADMIN) {
      throw new ForbiddenException(
        'Only organization owners and admins can manage domain mappings',
      );
    }
  }
}
