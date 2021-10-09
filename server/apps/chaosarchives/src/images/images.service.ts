import { serverConfiguration } from '@app/configuration';
import { Character, Image } from '@app/entity';
import { ImageUploadRequestDto } from '@app/shared/dto/image/image-upload-request.dto';
import { ImageDto } from '@app/shared/dto/image/image.dto';
import { ImageCategory } from '@app/shared/enums/image-category.enum';
import { ImageFormat } from '@app/shared/enums/image-format.enum';
import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import BufferList from 'bl';
import { promises } from 'fs';
import JpegTran from 'jpegtran';
import sharp from 'sharp';
import { Readable } from 'stream';
import { Connection, IsNull, Not } from 'typeorm';
import { UserInfo } from '../auth/user-info';
import { hashFile } from '../common/security';
import { StorageService } from './storage.service';

interface ImageResult {
	buffer: Buffer;
	format: ImageFormat;
	width: number;
	height: number;
}

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
        const { buffer, format, width, height } = await this.sanitizeImage(origBuffer, origMimetype);
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

	private async sanitizeImage(buffer: Buffer, mimetype: string): Promise<ImageResult> {
		if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
      throw new BadRequestException('Only JPEG and PNG formats are allowed');
    }

    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (
      metadata.format !== 'jpeg' &&
      metadata.format !== 'jpg' &&
      metadata.format !== 'png'
    ) {
      throw new BadRequestException('Only JPEG and PNG formats are allowed');
    }

    const isRotated = metadata.orientation && metadata.orientation >= 5;
    const height = isRotated ? metadata.width : metadata.height;
    const width = isRotated ? metadata.height : metadata.width;
    
    // At this stage, we know it's a PNG or JPEG image, but we can't just leave it as is:
    // the user might be trying to smuggle malicious content inside the image by e.g. doing
    // copy /b input.jpg + virus.exe input1.jpg
    // So we make sure that the image is generated by us, with no extra content.
    // And while we're at it, let's strip all EXIF metadata except orientation. 
    let result: Buffer;
    const format =
      metadata.format === 'png' ? ImageFormat.PNG : ImageFormat.JPEG;

    if (format === ImageFormat.PNG) {
      // PNG is lossless, so we can just re-save it as PNG using sharp.
      // TODO: use a PNG optimizer, as sharp produces larger PNGs than the original
      result = await image
        .withMetadata({
          orientation: metadata.orientation,
          density: metadata.density,
        })
        .toBuffer();
    } else {
      // JPEG is more complicated. It's lossy, so using sharp on it will degrade the image.
      // Instead, we use jpegtran to strip all metadata. As a side effect, it also deletes all extra content
      // after the end of the actual image.
      const jpegTranArgs = [
        '-copy', 'none',
        ...this.toJpegTranArgs(metadata.orientation || 1)
      ];

      // We reproduce EXIF orientation as plain JPEG data using jpegtran arguments

      result = await this.callJpegTran(buffer, jpegTranArgs);
    }

    await promises.writeFile('/tmp/__.jpg', result);

    return {
      buffer: result,
      format,
      width: width || -1,
      height: height || -1,
    };
	}

  private toJpegTranArgs(orientation: number): string[] {
    switch (orientation) {
      case 1:
        return [];
      case 2:
        return ['-flip', 'horizontal'];
      case 3:
        return ['-rotate', '180'];
      case 4:
        return ['-rotate', '180', '-flip', 'horizontal'];
      case 5:
        return ['-rotate', '90', '-flip', 'vertical'];
      case 6:
        return ['-rotate', '90'];
      case 7:
        return ['-rotate', '270', '-flip', 'vertical'];
      case 8:
        return ['-rotate', '270'];
      default:
        throw new BadRequestException('Invalid EXIF orientation tag');
    }
  }

  private async callJpegTran(buffer: Buffer, args?: (string|number)[]): Promise<Buffer> {
    const jpegTran = new JpegTran(args);

    return new Promise((resolve, reject) => {
      const source = new BufferList(buffer);
      const dest = new BufferList();
      
      (source as unknown as Readable).pipe(jpegTran).on('data', chunk => {
        dest.append(chunk);
      }).on('end', () => {
        resolve(dest.slice());
      }).on('error', e => {
        reject(e);
      });
    });
  }
}
