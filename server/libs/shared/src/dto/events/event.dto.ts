import { Type } from "class-transformer";
import { IsBoolean, isBoolean, IsNumber, IsOptional, IsString, IsUrl, MinLength, ValidateNested } from "class-validator";
import { BannerDto } from "../characters/banner.dto";

export class EventDto {
	@IsString()
	@MinLength(1)
	title: string;

	@IsBoolean()
	@IsOptional()
	mine: boolean;

	@IsString()
	details: string;

	@IsString()
	oocDetails: string;

	@IsNumber()
	startDateTime: number;

	@IsNumber()
	@IsOptional()
	endDateTime: number|null;

	@IsString()
	@IsOptional()
	link: string;

	@IsString()
	contact: string;

  @Type(() => BannerDto)
  @ValidateNested()
  @IsOptional()
  banner: BannerDto|null;

	@IsString()
	locationName: string;

	@IsString()
	locationAddress: string;

	@IsString()
	locationServer: string;

	@IsString()
	locationTags: string;

	constructor(properties?: Readonly<EventDto>) {
    if (properties) {
      Object.assign(this, properties);
    }
  }
}
