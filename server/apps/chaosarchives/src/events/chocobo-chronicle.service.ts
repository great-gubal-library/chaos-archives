import { EventLocationDto } from '@app/shared/dto/events/event-location.dto';
import { EventDto } from '@app/shared/dto/events/event.dto';
import SharedConstants from '@app/shared/SharedConstants';
import { HttpService, Injectable, Logger } from '@nestjs/common';
import { decode } from 'html-entities';
import { DateTime } from 'luxon';
import parse from 'node-html-parser';
import { ChocoboChronicleEventsDto } from './dto/chocobo-chronicle-events.dto';

@Injectable()
export class ChocoboChronicleService {
	private readonly log = new Logger(ChocoboChronicleService.name);

	private readonly EVENTS_API_URL = 'https://chocobochronicle.co.uk/wp-json/tribe/events/v1/events';

	private readonly DATE_TIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';

	constructor(
		private httpService: HttpService,
	) { }

	async fetchEvents(): Promise<EventDto[]> {
		const response = await this.httpService.get<ChocoboChronicleEventsDto>(this.EVENTS_API_URL).toPromise();
		const events = response.data.events;
    const today = DateTime.now()
      .setZone(SharedConstants.FFXIV_SERVER_TIMEZONE)
      .startOf('day')
			.toMillis();

		return events.map(event => (<EventDto>{
			name: this.processTitle(event.title),
			startDate: this.parseDate(event.utc_start_date),
			endDate: this.parseDate(event.utc_end_date),
			image: event.image.url,
			link: event.url,
			locations: this.parseLocations(event.description),
		})).filter(event => event.startDate >= today);
	}

	private processTitle(title: string): string {
		// Cut oddly formatted date from event title for aesthetic reasons
		return decode(title).replace(/ – \d{4} – \d{2} – \d{2}/, '');
	}

	private parseDate(date: string): number {
		return DateTime.fromFormat(date, this.DATE_TIME_FORMAT, {
			zone: 'UTC'
		}).toMillis();
	}

	private parseLocations(description: string): EventLocationDto[] {
		const doc = parse(description);
		const tableColumns = doc.querySelectorAll('td');

		return tableColumns.map(column => {
			// Here's hoping they won't change the layout and break everything...
			const divs = column.querySelectorAll('div');
			const name = divs[0].textContent.trim();
			const server = divs[3].textContent.trim();
			const address = divs[5].textContent.trim();
			const tags = divs[7].textContent.trim();

			return {
				name,
				address,
				server,
				tags,
			};
		});
	}
}