"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migratev1 = void 0;
const fs_1 = require("fs");
const migratev1 = async (location = './data/moodflow_backup.json') => {
    const json = await fs_1.promises.readFile(location);
    const input_data = JSON.parse(json.toString('utf8'));
    const output_data = {
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
        const year = {
            year: parseInt(y),
            months: [],
        };
        for (const [m, month_obj] of Object.entries(year_obj)) {
            const month = {
                month: parseInt(m),
                days: [],
            };
            for (const [d, day_obj] of Object.entries(month_obj)) {
                const day = {
                    day: parseInt(d),
                    last_updated: day_obj.entries[0].timestamp,
                    rating: day_obj.entries[0].rating,
                    description: day_obj.entries[0].optionalDescription,
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
exports.migratev1 = migratev1;
