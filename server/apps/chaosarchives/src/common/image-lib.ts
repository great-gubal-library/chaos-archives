import { ImageFormat } from "@app/shared/enums/image-format.enum";
import BufferList from 'bl';
import JpegTran from 'jpegtran';
import sharp from 'sharp';
import { Readable } from 'stream';
import { AppError } from "./app-error";

const THUMB_WIDTH = 174;

export interface ThumbProperties {
	left: number;
	top: number;
	width: number;
}

export interface ImageSanitizeResult {
	buffer: Buffer;
	thumb: Buffer;
	format: ImageFormat;
	width: number;
	height: number;
}

export class ImageSanitizeError extends AppError {
	
}

function toJpegTranArgs(orientation: number): string[] {
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
			throw new ImageSanitizeError('Invalid EXIF orientation tag');
	}
}

function callJpegTran(buffer: Buffer, args?: (string|number)[]): Promise<Buffer> {
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

export async function sanitizeImage(buffer: Buffer, thumb: ThumbProperties): Promise<ImageSanitizeResult> {
	const image = sharp(buffer);
	const metadata = await image.metadata();

	if (
		metadata.format !== 'jpeg' &&
		metadata.format !== 'jpg' &&
		metadata.format !== 'png'
	) {
		throw new ImageSanitizeError('Only JPEG and PNG formats are allowed');
	}

	const isRotated = metadata.orientation && metadata.orientation >= 5;
	const height = isRotated ? metadata.width : metadata.height;
	const width = isRotated ? metadata.height : metadata.width;

	if (!width || !height) {
		throw new ImageSanitizeError('Cannot read image');
	}

	if (thumb.left < 0 || thumb.top < 0 || thumb.width < 1
			|| thumb.left + thumb.width > width || thumb.top + thumb.width > height) {
		throw new ImageSanitizeError('Invalid thumbnail parameters');
	}
	
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
			...toJpegTranArgs(metadata.orientation || 1)
		];

		// We reproduce EXIF orientation as plain JPEG data using jpegtran arguments

		result = await callJpegTran(buffer, jpegTranArgs);
	}

	// Generate thumbnail
	const thumbOperation = sharp(result)
		.extract({
			left: thumb.left,
			top: thumb.top,
			width: thumb.width,
			height: thumb.width
		})
		.resize(THUMB_WIDTH)
		.toFormat(format === ImageFormat.PNG ? 'png' : 'jpeg');

	if (format === ImageFormat.JPEG) {
		thumbOperation.jpeg({
			quality: 90
		});
	}

	const thumbBuffer = await thumbOperation.toBuffer();

	return {
		buffer: result,
		thumb: thumbBuffer,
		format,
		width: width || -1,
		height: height || -1,
	};
}
