export const SETTINGS_PATH = './data/settings.json';

export const TOKEN_PATH = './data/credentials.json';

export const DIARY_NAME = 'diary.dat';

export const BACKUP_NAME = 'diary.dat.bak';

export const DIARY_PATH = `./data/${DIARY_NAME}`;

export const BACKUP_PATH = `./data/${BACKUP_NAME}`;

export const FILE_VERSION = 1;

export const SCOPES = [
	'https://www.googleapis.com/auth/userinfo.profile',
	'https://www.googleapis.com/auth/drive.appdata',
];

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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PrivateSettings {}

export interface JSONDiary {
	years: Array<YearHolder>;
	settings: PrivateSettings;
	metadata: MetaData;
}

export interface Settings {
	sync: boolean;
	backup1_id: string | null | undefined;
	backup2_id: string | null | undefined;
}

export interface OpenDiary {
	key: string | null;
	diary: JSONDiary;
}
