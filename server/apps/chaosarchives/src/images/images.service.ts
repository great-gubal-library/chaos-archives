import { serverConfiguration } from '@app/configuration';
import { Character, Image } from '@app/entity';
import { ImageUploadRequestDto } from '@app/shared/dto/image/image-upload-request.dto';
import { ImageDto } from '@app/shared/dto/image/image.dto';
import { ImageCategory } from '@app/shared/enums/image-category.enum';
import { ImageFormat } from '@app/shared/enums/image-format.enum';
import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Connection, IsNull, Not } from 'typeorm';
import { UserInfo } from '../auth/user-info';
import { ImageSanitizeError, ImageSanitizeResult, sanitizeImage } from '../common/image-lib';
import { hashFile } from '../common/security';
import { StorageService } from './storage.service';

@Injectable()
export class ImagesService {
  constructor(private storageService: StorageService, private connection: Connection) { }
  
  async uploadImage(
		user: UserInfo,
    request: ImageUploadRequestDto,
    origBuffer: Buffer,
    origFilename: string,
    origMimetype: string,
  ): Promise<ImageDto> {
    // Validate category and title
		if (request.category !== ImageCategory.UNLISTED && !request.title.trim()) {
			throw new BadRequestException('Title is required for artwork and screenshots');
		}

    // Remember uploaded path in case upload succeeds but then the transaction fails
    let uploadedPath: string|null = null;

    try {
      return await this.connection.transaction(async em => {
        // Validate character ID
        const character = await em.getRepository(Character).findOne({
          where: {
            id: request.characterId,
            verifiedAt: Not(IsNull()),
            user: {
              id: user.id
            }
          },
          select: ['id']
        });

        if (!character) {
          throw new BadRequestException('Invalid character ID');
        }

        // Replace characters forbidden in Windows and Unix filenames
        const filename = origFilename.replace(/[<>:"/\\|?*]/g, '_');

        // Prepare and upload image
        let sanitizeResult: ImageSanitizeResult;

        try {
          sanitizeResult = await sanitizeImage(origBuffer, origMimetype);
        } catch (e) {
          if (e instanceof ImageSanitizeError) {
            throw new BadRequestException(e.message);
          }

          throw e;
        }

        const { buffer, format, width, height } = sanitizeResult;
        const size = buffer.length;
        const hash = await hashFile(buffer);
        const path = `${character.id}/${hash}/${filename}`;
        const mimetype = format === ImageFormat.PNG ? 'image/png' : 'image/jpeg';

        // Check that this is not a duplicate upload
        const existingImage = await em.getRepository(Image).findOne({
          where: {
            hash,
            owner: character
          },
          select: [ 'id', 'filename' ]
        });

        if (existingImage && existingImage.id) {
          throw new ConflictException(
            `You already have an image with the same contents: ${existingImage.filename}`);
        }

        // Check the user still has upload space left
        const maxUploadSpaceMiB = serverConfiguration.maxUploadSpacePerUserMiB;
        const maxUploadSpaceBytes = maxUploadSpaceMiB * 1024 * 1024;
        const currentUploadSpaceBytes = await em.getRepository(Image).createQueryBuilder('image')
          .innerJoinAndSelect('image.owner', 'character')
          .innerJoinAndSelect('character.user', 'user')
          .where('user.id = :userId', { userId: user.id })
          .select('SUM(image.size)')
          .getRawOne();

        if (currentUploadSpaceBytes + size > maxUploadSpaceBytes) {
          throw new BadRequestException(`You have too much image content stored (maximum is ${maxUploadSpaceMiB})`);
        }

        try {
          await this.storageService.uploadFile(path, buffer, mimetype);
        } catch (e) {
          throw new ServiceUnavailableException('Cannot upload file to storage service');
        }
        uploadedPath = path;

        // Save image in database
        const image = await em.getRepository(Image).save({
          owner: character,
          width,
          height,
          size,
          hash,
          filename,
          category: request.category,
          format
        });
    
        return {
          id: image.id,
          url: this.storageService.getUrl(path),
          filename,
          width,
          height,
          size,
          createdAt: Date.now(),
        };
      });
    } catch (e) {
      if (uploadedPath) {
        // We uploaded the file before the transaction failed. Delete it.
        try {
          await this.storageService.deleteFile(uploadedPath);
        } catch (ex) {
          // Well, what can we do?
        }
      }

      throw e;
    }
  }
}
