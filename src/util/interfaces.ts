export enum Rating {
	VeryBad = 1,
	Bad = 2,
	OK = 3,
	Good = 4,
	VeryGood = 5,
}

export enum Month {
	January = 1,
	Feburary = 2,
	March = 3,
	April = 4,
	May = 5,
	June = 6,
	July = 7,
	August = 8,
	September = 9,
	October = 10,
	November = 11,
	December = 12,
}

export interface DailyEntry {
	day: number;
	last_updated: number;
	rating: Rating;
	description: string;
	is_important: boolean;
}

export interface YearHolder {
	year: number;
	months: Array<MonthHolder>;
}

export interface MonthHolder {
	month: Month;
	days: Array<DailyEntry>;
}

export interface MetaData {
	version: number;
	last_updated: number;
}

export interface Settings {
	sync: boolean;
}

export interface JSONFormat {
	years: Array<YearHolder>;
	settings: Settings;
	metadata: MetaData;
}
