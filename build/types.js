"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Day = exports.Month = exports.Rating = exports.SCOPES = exports.FILE_VERSION = exports.DUMP_PATH = exports.BACKUP_PATH = exports.DIARY_PATH = exports.BACKUP_NAME = exports.DIARY_NAME = exports.TOKEN_PATH = exports.SETTINGS_PATH = exports.DATA_PATH = exports.VERSION = void 0;
exports.VERSION = '0.0.4';
exports.DATA_PATH = './data';
exports.SETTINGS_PATH = `${exports.DATA_PATH}/settings.json`;
exports.TOKEN_PATH = `${exports.DATA_PATH}/credentials.json`;
exports.DIARY_NAME = 'diary.dat';
exports.BACKUP_NAME = 'diary.dat.bak';
exports.DIARY_PATH = `${exports.DATA_PATH}/${exports.DIARY_NAME}`;
exports.BACKUP_PATH = `${exports.DATA_PATH}/${exports.BACKUP_NAME}`;
exports.DUMP_PATH = `${exports.DATA_PATH}/dump`;
exports.FILE_VERSION = 1;
exports.SCOPES = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/drive.appdata',
];
var Rating;
(function (Rating) {
    Rating[Rating["VeryBad"] = 1] = "VeryBad";
    Rating[Rating["Bad"] = 2] = "Bad";
    Rating[Rating["OK"] = 3] = "OK";
    Rating[Rating["Good"] = 4] = "Good";
    Rating[Rating["VeryGood"] = 5] = "VeryGood";
})(Rating = exports.Rating || (exports.Rating = {}));
var Month;
(function (Month) {
    Month[Month["January"] = 1] = "January";
    Month[Month["Feburary"] = 2] = "Feburary";
    Month[Month["March"] = 3] = "March";
    Month[Month["April"] = 4] = "April";
    Month[Month["May"] = 5] = "May";
    Month[Month["June"] = 6] = "June";
    Month[Month["July"] = 7] = "July";
    Month[Month["August"] = 8] = "August";
    Month[Month["September"] = 9] = "September";
    Month[Month["October"] = 10] = "October";
    Month[Month["November"] = 11] = "November";
    Month[Month["December"] = 12] = "December";
})(Month = exports.Month || (exports.Month = {}));
var Day;
(function (Day) {
    Day[Day["Sunday"] = 0] = "Sunday";
    Day[Day["Monday"] = 1] = "Monday";
    Day[Day["Tuesday"] = 2] = "Tuesday";
    Day[Day["Wednesday"] = 3] = "Wednesday";
    Day[Day["Thursday"] = 4] = "Thursday";
    Day[Day["Friday"] = 5] = "Friday";
    Day[Day["Saturday"] = 6] = "Saturday";
})(Day = exports.Day || (exports.Day = {}));
