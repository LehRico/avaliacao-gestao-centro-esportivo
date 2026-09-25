import { Body, Controller, Get, Param, Patch } from '@nestjs/common'
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { UpdateUserRoleDto } from './dto/update-user-role.dto'
import { Auth } from '../common/decorators/auth.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator'

@ApiTags('Users')
@ApiSecurity('api-key')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('me')
    @Auth()
    getMe(@CurrentUser() user: CurrentUserPayload) {
        return this.usersService.findMe(user.userId);
    }

    @Get()
    @Auth('ADMIN')
    findAll() {
        return this.usersService.findAll();
    }

    @Patch(':id/role')
    @Auth('ADMIN')
    updateRole(
        @Param('id') id: string,
        @Body() dto: UpdateUserRoleDto,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        return this.usersService.updateRole(id, dto, user.userId);
    }
}