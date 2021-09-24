/* eslint-disable @typescript-eslint/ban-ts-comment */
import { DailyEntry, JSONDiary, MonthHolder, YearHolder } from './types';
import { promises as fsp } from 'fs';

/**
 * migrates moodflow json to file version 1
 */
export const migratev1 = async (
	location = './data/moodflow_backup.json'
): Promise<JSONDiary> => {
	const json = await fsp.readFile(location);
	const input_data = JSON.parse(json.toString('utf8'));
	const output_data: JSONDiary = {
		settings: {
			sync: false,
		},
		metadata: {
			version: 1,
			last_updated: Date.now(),
		},
		years: [],
	};

	for (const [y, year_obj] of Object.entries(input_data.data.moods)) {
		const year: YearHolder = {
			year: parseInt(y),
			months: [],
		};

		// @ts-ignore
		for (const [m, month_obj] of Object.entries(year_obj)) {
			const month: MonthHolder = {
				month: parseInt(m),
				days: [],
			};

			// @ts-ignore
			for (const [d, day_obj] of Object.entries(month_obj)) {
				const day: DailyEntry = {
					day: parseInt(d),
					// @ts-ignore
					last_updated: day_obj.entries[0].timestamp,
					// @ts-ignore
					rating: day_obj.entries[0].rating,
					// @ts-ignore
					description: day_obj.entries[0].optionalDescription,
					// @ts-ignore
					is_important: day_obj.isSpecialDay,
				};

				month.days.push(day);
			}

			year.months.push(month);
		}

		output_data.years.push(year);
	}

	return output_data;
};
