import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@easymatch/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DropdownsService } from '../dropdowns/dropdowns.service';
import { CreateDropdownOptionDto } from './dto/create-dropdown-option.dto';
import { UpdateDropdownOptionDto } from './dto/update-dropdown-option.dto';

@Controller('admin/dropdowns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminDropdownsController {
  constructor(private readonly dropdownsService: DropdownsService) {}

  @Get('categories')
  listCategories() {
    return this.dropdownsService.listCategories();
  }

  @Get()
  listOptions(@Query('category') category?: string) {
    return this.dropdownsService.listAllForAdmin(category);
  }

  @Post()
  createOption(@Body() dto: CreateDropdownOptionDto) {
    return this.dropdownsService.createOption(dto);
  }

  @Put(':id')
  updateOption(@Param('id') id: string, @Body() dto: UpdateDropdownOptionDto) {
    return this.dropdownsService.updateOption(id, dto);
  }

  @Delete(':id')
  deleteOption(@Param('id') id: string) {
    return this.dropdownsService.deleteOption(id);
  }
}
