import { Type } from "class-transformer";
import { IsNumber } from "class-validator";
import { ImageDescriptionDto } from "./image-desciption.dto";

export class ImageUploadRequestDto extends ImageDescriptionDto {
	@Type(() => Number)
	@IsNumber()
	readonly characterId: number;

	@Type(() => Number)
	@IsNumber()
	readonly thumbLeft: number;

	@Type(() => Number)
	@IsNumber()
	readonly thumbTop: number;

	@Type(() => Number)
	@IsNumber()
	readonly thumbWidth: number;

	constructor(properties?: Readonly<ImageUploadRequestDto>) {
		super();

    if (properties) {
      Object.assign(this, properties);
    }
  }
}
