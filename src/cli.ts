import { DataContainer } from './types';
import chalk from 'chalk';

const fmt_cmd = (s: string) =>
	s.replace(/\{(\w+)\}/g, `\`${chalk.bold('$1')}\``);

export const info = (d: DataContainer, s: string | string[]): void => {
	if (Array.isArray(s))
		s.map(_ => console.log(d.opened_diary ? '[*D]' : '[*]', fmt_cmd(_)));
	else console.log(d.opened_diary ? '[*D]' : '[*]', fmt_cmd(s));
};

export const success = (d: DataContainer, s: string): void =>
	console.log(chalk.green(d.opened_diary ? '[*D]' : '[*]'), fmt_cmd(s));

export const warn = (d: DataContainer, s: string): void => {
	console.log(chalk.yellowBright(d.opened_diary ? '[!D]' : '[!]'), fmt_cmd(s));
};

export const err = (d: DataContainer, s: string, e: string): void =>
	console.log(chalk.redBright(d.opened_diary ? '[!D]' : '[!]'), fmt_cmd(s), e);

export const critical = (d: DataContainer, s: string, e: string): void =>
	console.log(
		chalk.bgRedBright(d.opened_diary ? '[!!!D]' : '[!!!]'),
		fmt_cmd(s),
		e
	);
