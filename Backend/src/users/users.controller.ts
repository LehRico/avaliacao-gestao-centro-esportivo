import { Controller, Get } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { Auth } from '../common/decorators/auth.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator'

@ApiTags('Users')
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
}