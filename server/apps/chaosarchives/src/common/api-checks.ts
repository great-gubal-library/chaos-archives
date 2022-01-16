import { UserInfo } from "@app/auth/model/user-info";
import { Role, roleImplies } from "@app/shared/enums/role.enum";
import { BadRequestException } from "@nestjs/common";

const DOMAIN_REGEX = /^([A-Za-z0-9-]+\.)+[A-Za-z0-9-]+$/;
const SUBDOMAIN_REGEX = /^[A-Za-z0-9-]+$/;

export function checkCarrdProfile(carrdProfile: string, user: UserInfo): string {
	const valid = SUBDOMAIN_REGEX.exec(carrdProfile)
		|| (roleImplies(user.role, Role.TRUSTED) && DOMAIN_REGEX.test(carrdProfile));
	
	if (!valid) {
		throw new BadRequestException('Invalid Carrd profile link');
	}

	return carrdProfile;
}
