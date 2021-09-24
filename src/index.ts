/* eslint-disable no-console */
import * as readline from 'readline';
import { promisify } from 'util';

/**
 * prompt a password from the user to decrypt the diary
 *
 * TODO replace with an actual function hopefully
 */
export const prompt_pwd = async (): Promise<string> => {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	/**
	 * begin copy pasted code to promisify rl.question
	 * I don't believe this implementation supports aborting
	 * see https://nodejs.org/api/readline.html#readline_rl_question_query_options_callback
	 * code taken from https://gist.github.com/januswel/c1634511a88ed2ce4c32d1763a8b0402
	 */
	const q = rl.question as unknown as {
		[promisify.custom]: (question: string) => Promise<string>;
	};

	q[promisify.custom] = (question: string) =>
		new Promise<string>(resolve => {
			rl.question(question, input => {
				resolve(input);
			});
		}).finally(() => {
			rl.close();
		});

	const question = promisify(rl.question) as unknown as (
		q: string
	) => Promise<string>;
	// end copy pasted code to promisify rl.question

	const pwd = (await question('password: ')) || 'a very secret key';

	return pwd;
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
const main = async (): Promise<void> => {};

main();
