/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as fs from 'fs';
import * as interfaces from './interfaces';

export const migratev1 = (
	location = 'data/moodflow_backup.json'
): interfaces.JSONFormat => {
	const input_data = JSON.parse(fs.readFileSync(location).toString('utf8'));
	const output_data: interfaces.JSONFormat = {
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
		const year: interfaces.YearHolder = {
			year: parseInt(y),
			months: [],
		};

		// @ts-ignore
		for (const [m, month_obj] of Object.entries(year_obj)) {
			const month: interfaces.MonthHolder = {
				month: parseInt(m),
				days: [],
			};

			// @ts-ignore
			for (const [d, day_obj] of Object.entries(month_obj)) {
				const day: interfaces.DailyEntry = {
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
